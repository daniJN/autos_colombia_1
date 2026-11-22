from datetime import date, datetime, timezone, timedelta
from calendar import monthrange
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, inspect, text
from .database import Base, engine, get_db
from . import models, schemas
from .security import hash_password, verify_password, create_token, current_user, admin_only

Base.metadata.create_all(bind=engine)
with engine.begin() as connection:
    vehicle_columns={column["name"] for column in inspect(connection).get_columns("vehiculos")}
    if "activo" not in vehicle_columns:
        connection.execute(text("ALTER TABLE vehiculos ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE"))
VEHICLE_TYPES=("Carro","Moto")
app = FastAPI(title="Autos Colombia API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:4200"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def seed():
    db = next(get_db())
    try:
        if not db.query(models.User).filter_by(username="admin").first():
            db.add(models.User(nombre_completo="Administrador principal", documento="1000000000", username="admin",
                password_hash=hash_password("Admin12345"), rol="Administrador", correo="admin@autoscolombia.local"))
        for name in VEHICLE_TYPES:
            if not db.query(models.CellType).filter_by(nombre=name).first():
                db.add(models.CellType(nombre=name))
        db.commit()
    finally:
        db.close()

def audit(db, user, action, detail=""):
    db.add(models.Audit(usuario_id=user.id, accion=action, detalle=detail))

def plate(value):
    return "".join(ch for ch in value.upper() if ch.isalnum())

def monthly_rate(vehicle_type):
    return {"Carro":250000,"Moto":100000}.get(vehicle_type)

def next_month_end(start):
    year=start.year+(1 if start.month==12 else 0)
    month=1 if start.month==12 else start.month+1
    day=min(start.day,monthrange(year,month)[1])
    return date(year,month,day)-timedelta(days=1)

def user_out(u):
    return {"id":u.id,"nombre_completo":u.nombre_completo,"tipo_documento":u.tipo_documento,"documento":u.documento,
            "telefono":u.telefono,"correo":u.correo,"username":u.username,"rol":u.rol,"activo":u.activo}

@app.get("/")
def root(): return {"ok":True,"app":"Autos Colombia","docs":"/docs"}

@app.post("/api/auth/login")
def login(data: schemas.LoginIn, db: Session = Depends(get_db)):
    u = db.query(models.User).filter_by(username=data.username).first()
    if not u or not u.activo or not verify_password(data.password, u.password_hash):
        raise HTTPException(401, "Usuario o contraseña incorrectos")
    return {"access_token":create_token(u),"token_type":"bearer","user":user_out(u)}

@app.get("/api/auth/me")
def me(user=Depends(current_user)): return user_out(user)

@app.post("/api/auth/change-password")
def change_password(data: schemas.PasswordChange, db: Session=Depends(get_db), user=Depends(current_user)):
    if not verify_password(data.actual, user.password_hash): raise HTTPException(400,"La contraseña actual no coincide")
    if not any(c.isalpha() for c in data.nueva) or not any(c.isdigit() for c in data.nueva):
        raise HTTPException(400,"La contraseña debe combinar letras y números")
    user.password_hash=hash_password(data.nueva); audit(db,user,"Cambio de contraseña"); db.commit()
    return {"message":"Contraseña actualizada"}

@app.get("/api/dashboard")
def dashboard(db: Session=Depends(get_db), user=Depends(current_user)):
    cells_query=db.query(models.Cell).join(models.CellType).filter(models.CellType.nombre.in_(VEHICLE_TYPES))
    payments_query=db.query(models.Payment).join(models.Membership).join(models.Vehicle).filter(models.Vehicle.tipo.in_(VEHICLE_TYPES))
    return {
      "celdas":cells_query.count(),
      "disponibles":cells_query.filter(models.Cell.estado=="Disponible").count(),
      "ocupadas":cells_query.filter(models.Cell.estado=="Ocupada").count(),
      "inhabilitadas":cells_query.filter(models.Cell.estado=="Inhabilitada").count(),
      "vehiculos_activos":db.query(models.Movement).filter(models.Movement.fecha_salida==None,models.Movement.tipo_vehiculo.in_(VEHICLE_TYPES)).count(),
      "pagos_mes":float(payments_query.filter(func.date_trunc("month",models.Payment.fecha_pago)==func.date_trunc("month",func.now())).with_entities(func.coalesce(func.sum(models.Payment.valor),0)).scalar() or 0)
    }

# USUARIOS
@app.get("/api/users")
def users(db:Session=Depends(get_db), user=Depends(current_user), q:str=""):
    query=db.query(models.User).filter(models.User.id!=user.id)
    if q: query=query.filter((models.User.nombre_completo.ilike(f"%{q}%"))|(models.User.documento.ilike(f"%{q}%"))|(models.User.username.ilike(f"%{q}%")))
    return [user_out(x) for x in query.order_by(models.User.id.desc()).all()]

@app.post("/api/users")
def create_user(data:schemas.UserCreate, db:Session=Depends(get_db), user=Depends(admin_only)):
    if data.rol not in ["Administrador","Operario"]: raise HTTPException(400,"Rol inválido")
    if db.query(models.User).filter((models.User.username==data.username)|(models.User.documento==data.documento)).first():
        raise HTTPException(409,"El documento o nombre de usuario ya existe")
    if not any(c.isalpha() for c in data.password) or not any(c.isdigit() for c in data.password): raise HTTPException(400,"La contraseña debe combinar letras y números")
    u=models.User(nombre_completo=data.nombre_completo,tipo_documento=data.tipo_documento,documento=data.documento,
      telefono=data.telefono,correo=data.correo,username=data.username,password_hash=hash_password(data.password),rol=data.rol)
    db.add(u); db.flush(); audit(db,user,"Creó usuario",u.username); db.commit(); return user_out(u)

@app.put("/api/users/{uid}")
def update_user(uid:int,data:schemas.UserUpdate,db:Session=Depends(get_db),user=Depends(admin_only)):
    u=db.query(models.User).get(uid)
    if not u: raise HTTPException(404,"Usuario no encontrado")
    for k,v in data.model_dump(exclude_unset=True).items():
        if k=="rol" and v not in ["Administrador","Operario"]: raise HTTPException(400,"Rol inválido")
        if k=="activo" and uid==user.id and v is False: raise HTTPException(400,"No puedes desactivarte a ti mismo")
        setattr(u,k,v)
    audit(db,user,"Actualizó usuario",u.username); db.commit(); return user_out(u)

# TIPOS Y CELDAS
@app.get("/api/cell-types")
def cell_types(db:Session=Depends(get_db),user=Depends(current_user)):
    return [{"id":x.id,"nombre":x.nombre,"activo":x.activo} for x in db.query(models.CellType).filter(models.CellType.nombre.in_(VEHICLE_TYPES)).all()]

@app.post("/api/cell-types")
def add_type(data:dict,db:Session=Depends(get_db),user=Depends(admin_only)):
    name=(data.get("nombre") or "").strip()
    if not name: raise HTTPException(400,"Nombre obligatorio")
    if name not in VEHICLE_TYPES: raise HTTPException(400,"Solo se permiten celdas para carros y motos")
    if db.query(models.CellType).filter_by(nombre=name).first(): raise HTTPException(409,"Tipo ya existe")
    t=models.CellType(nombre=name); db.add(t); audit(db,user,"Creó tipo de celda",name); db.commit(); return {"id":t.id,"nombre":t.nombre}

@app.get("/api/cells")
def cells(db:Session=Depends(get_db),user=Depends(current_user),tipo:str="",estado:str="",q:str=""):
    query=db.query(models.Cell).join(models.CellType).options(joinedload(models.Cell.tipo)).filter(models.CellType.nombre.in_(VEHICLE_TYPES))
    if tipo: query=query.filter(models.CellType.nombre==tipo)
    if estado: query=query.filter(models.Cell.estado==estado)
    if q: query=query.filter((models.Cell.codigo.ilike(f"%{q}%"))|(models.Cell.nombre.ilike(f"%{q}%")))
    rows=query.order_by(models.Cell.codigo).all()
    result=[]
    for c in rows:
        active=db.query(models.Movement).filter_by(celda_id=c.id,fecha_salida=None).first()
        result.append({"id":c.id,"codigo":c.codigo,"nombre":c.nombre,"tipo":c.tipo.nombre,"estado":c.estado,"placa":active.placa if active else None})
    return result

@app.post("/api/cells")
def add_cell(data:schemas.CellCreate,db:Session=Depends(get_db),user=Depends(admin_only)):
    if db.query(models.Cell).filter_by(codigo=data.codigo.upper()).first(): raise HTTPException(409,"Código de celda duplicado")
    if data.tipo not in VEHICLE_TYPES: raise HTTPException(400,"Solo se permiten celdas para carros y motos")
    t=db.query(models.CellType).filter_by(nombre=data.tipo,activo=True).first()
    if not t: raise HTTPException(400,"Tipo de celda inválido")
    if data.estado not in ["Disponible","Inhabilitada"]: raise HTTPException(400,"Estado inicial inválido")
    c=models.Cell(codigo=data.codigo.upper(),nombre=data.nombre,tipo_id=t.id,estado=data.estado)
    db.add(c); audit(db,user,"Creó celda",c.codigo); db.commit(); return {"message":"Celda creada","id":c.id}

@app.put("/api/cells/{cid}")
def update_cell(cid:int,data:schemas.CellUpdate,db:Session=Depends(get_db),user=Depends(admin_only)):
    c=db.query(models.Cell).get(cid)
    if not c: raise HTTPException(404,"Celda no encontrada")
    values=data.model_dump(exclude_unset=True)
    if "estado" in values and values["estado"]=="Inhabilitada":
        if c.estado=="Ocupada": raise HTTPException(400,"No se puede inhabilitar una celda ocupada")
        if db.query(models.Membership).filter_by(celda_fija_id=cid,activa=True).first(): raise HTTPException(400,"Tiene mensualidad fija activa")
    if "tipo" in values:
        if values["tipo"] not in VEHICLE_TYPES: raise HTTPException(400,"Solo se permiten celdas para carros y motos")
        t=db.query(models.CellType).filter_by(nombre=values.pop("tipo")).first()
        if not t: raise HTTPException(400,"Tipo no encontrado")
        c.tipo_id=t.id
    for k,v in values.items(): setattr(c,k,v)
    audit(db,user,"Actualizó celda",c.codigo); db.commit(); return {"message":"Celda actualizada"}

# CLIENTES, VEHICULOS, MENSUALIDADES
@app.get("/api/customers")
def customers(db:Session=Depends(get_db),user=Depends(current_user)):
    return [{"id":c.id,"nombre":c.nombre,"documento":c.documento,"telefono":c.telefono,"correo":c.correo,"activo":c.activo} for c in db.query(models.Customer).all()]

@app.post("/api/customers")
def add_customer(data:schemas.CustomerCreate,db:Session=Depends(get_db),user=Depends(current_user)):
    if db.query(models.Customer).filter_by(documento=data.documento).first(): raise HTTPException(409,"Documento de cliente ya registrado")
    c=models.Customer(**data.model_dump()); db.add(c); audit(db,user,"Creó cliente",c.documento); db.commit(); return {"id":c.id,"message":"Cliente creado"}

@app.put("/api/customers/{customer_id}")
def update_customer(customer_id:int,data:schemas.CustomerUpdate,db:Session=Depends(get_db),user=Depends(admin_only)):
    customer=db.query(models.Customer).filter_by(id=customer_id).first()
    if not customer: raise HTTPException(404,"Cliente no encontrado")
    values=data.model_dump(exclude_unset=True)
    if not values: raise HTTPException(400,"No se enviaron cambios para el cliente")
    if "documento" in values and db.query(models.Customer).filter(models.Customer.documento==values["documento"],models.Customer.id!=customer_id).first():
        raise HTTPException(409,"Documento de cliente ya registrado")
    for key,value in values.items():
        setattr(customer,key,value)
    action="Actualizó cliente" if any(key!="activo" for key in values) else ("Activó cliente" if customer.activo else "Desactivó cliente")
    audit(db,user,action,customer.documento)
    db.commit()
    return {"message":"Cliente actualizado" if any(key!="activo" for key in values) else ("Cliente activado" if customer.activo else "Cliente desactivado"),"activo":customer.activo}

@app.get("/api/vehicles")
def vehicles(db:Session=Depends(get_db),user=Depends(current_user)):
    return [{"id":v.id,"placa":v.placa,"tipo":v.tipo,"cliente":v.cliente.nombre,"cliente_id":v.cliente_id,"cliente_activo":v.cliente.activo,"activo":v.activo} for v in db.query(models.Vehicle).options(joinedload(models.Vehicle.cliente)).filter(models.Vehicle.tipo.in_(VEHICLE_TYPES)).all()]

@app.post("/api/vehicles")
def add_vehicle(data:schemas.VehicleCreate,db:Session=Depends(get_db),user=Depends(current_user)):
    p=plate(data.placa)
    if not p: raise HTTPException(400,"La placa debe contener letras o números")
    if db.query(models.Vehicle).filter_by(placa=p).first(): raise HTTPException(409,"Placa ya registrada")
    if data.tipo not in VEHICLE_TYPES: raise HTTPException(400,"El parqueadero solo recibe carros y motos")
    if not db.query(models.Customer).filter_by(id=data.cliente_id,activo=True).first(): raise HTTPException(404,"Cliente no encontrado")
    v=models.Vehicle(placa=p,tipo=data.tipo,cliente_id=data.cliente_id); db.add(v); audit(db,user,"Registró vehículo",p); db.commit(); return {"id":v.id,"placa":v.placa}

@app.put("/api/vehicles/{vehicle_id}")
def update_vehicle(vehicle_id:int,data:schemas.VehicleUpdate,db:Session=Depends(get_db),user=Depends(admin_only)):
    vehicle=db.query(models.Vehicle).filter_by(id=vehicle_id).first()
    if not vehicle: raise HTTPException(404,"Vehículo no encontrado")
    values=data.model_dump(exclude_unset=True)
    if not values: raise HTTPException(400,"No se enviaron cambios para el vehículo")
    if "placa" in values:
        values["placa"]=plate(values["placa"])
        if not values["placa"]: raise HTTPException(400,"La placa debe contener letras o números")
        if db.query(models.Vehicle).filter(models.Vehicle.placa==values["placa"],models.Vehicle.id!=vehicle_id).first():
            raise HTTPException(409,"Placa ya registrada")
    if "cliente_id" in values:
        customer=db.query(models.Customer).filter_by(id=values["cliente_id"]).first()
        if not customer: raise HTTPException(404,"Cliente no encontrado")
        if customer.id!=vehicle.cliente_id and not customer.activo:
            raise HTTPException(400,"Selecciona un cliente activo para el vehículo")
    active_movement=db.query(models.Movement).filter_by(placa=vehicle.placa,fecha_salida=None).first()
    if active_movement and (values.get("activo") is False or any(values.get(key,getattr(vehicle,key))!=getattr(vehicle,key) for key in ("placa","tipo","cliente_id"))):
        raise HTTPException(400,"No se puede actualizar o inhabilitar un vehículo que está dentro del parqueadero")
    for key,value in values.items():
        setattr(vehicle,key,value)
    action="Actualizó vehículo" if any(key!="activo" for key in values) else ("Habilitó vehículo" if vehicle.activo else "Inhabilitó vehículo")
    audit(db,user,action,vehicle.placa)
    db.commit()
    return {"message":"Vehículo actualizado" if any(key!="activo" for key in values) else ("Vehículo habilitado" if vehicle.activo else "Vehículo inhabilitado"),"activo":vehicle.activo}

@app.get("/api/memberships")
def memberships(db:Session=Depends(get_db),user=Depends(current_user)):
    vehicles=db.query(models.Vehicle).options(joinedload(models.Vehicle.cliente)).filter(models.Vehicle.tipo.in_(VEHICLE_TYPES)).order_by(models.Vehicle.placa).all()
    rows=db.query(models.Membership).join(models.Vehicle).options(joinedload(models.Membership.vehiculo)).filter(models.Vehicle.tipo.in_(VEHICLE_TYPES)).order_by(models.Membership.id.desc()).all()
    latest_by_vehicle={}
    for membership in rows:
        latest_by_vehicle.setdefault(membership.vehiculo_id,membership)
    result=[]
    for vehicle in vehicles:
        membership=latest_by_vehicle.get(vehicle.id)
        result.append({
          "id":membership.id if membership else None,
          "placa":vehicle.placa,
          "tipo":vehicle.tipo,
          "fecha_inicio":membership.fecha_inicio if membership else None,
          "fecha_fin":membership.fecha_fin if membership else None,
          "valor":float(membership.valor) if membership else monthly_rate(vehicle.tipo),
          "activa":membership.activa if membership else True,
          "vehiculo_id":vehicle.id,
          "vehiculo_activo":vehicle.activo,
          "cliente_activo":vehicle.cliente.activo
        })
    return result

@app.post("/api/memberships")
def add_membership(data:schemas.MembershipCreate,db:Session=Depends(get_db),user=Depends(current_user)):
    if data.celda_fija_id and user.rol != "Administrador":
        raise HTTPException(403,"Solo el Administrador puede asignar celdas fijas a mensualidades")
    v=db.query(models.Vehicle).filter_by(id=data.vehiculo_id).first()
    if not v: raise HTTPException(404,"Vehículo no encontrado")
    if not v.activo: raise HTTPException(400,"El vehículo está inhabilitado")
    if not v.cliente.activo: raise HTTPException(400,"El cliente está inactivo")
    rate=monthly_rate(v.tipo)
    if rate is None: raise HTTPException(400,"Las mensualidades solo están disponibles para carros y motos")
    if data.fecha_inicio != date.today():
        raise HTTPException(400,"La fecha de inicio debe coincidir con la fecha de registro de hoy")
    if data.fecha_fin < data.fecha_inicio: raise HTTPException(400,"Fecha final inválida")
    if data.celda_fija_id:
        c=db.query(models.Cell).filter_by(id=data.celda_fija_id,estado="Disponible").first()
        if not c or c.tipo.nombre != v.tipo: raise HTTPException(400,"Celda fija no disponible o incompatible")
    m=models.Membership(vehiculo_id=data.vehiculo_id,fecha_inicio=data.fecha_inicio,fecha_fin=data.fecha_fin,
      valor=rate,celda_fija_id=data.celda_fija_id); db.add(m); audit(db,user,"Creó mensualidad",v.placa); db.commit(); return {"id":m.id,"message":"Mensualidad creada"}

# PAGOS
@app.get("/api/payments")
def payments(db:Session=Depends(get_db),user=Depends(current_user)):
    rows=db.query(models.Payment).join(models.Membership).join(models.Vehicle).options(joinedload(models.Payment.mensualidad).joinedload(models.Membership.vehiculo),joinedload(models.Payment.usuario)).filter(models.Vehicle.tipo.in_(VEHICLE_TYPES)).order_by(models.Payment.id.desc()).all()
    return [{"id":p.id,"mensualidad_id":p.mensualidad_id,"vehiculo_id":p.mensualidad.vehiculo.id,"placa":p.mensualidad.vehiculo.placa,"fecha_pago":p.fecha_pago,"periodo_desde":p.periodo_desde,"periodo_hasta":p.periodo_hasta,"valor":float(p.valor),"metodo":p.metodo,"referencia":p.referencia,"recibido_por":p.usuario.username} for p in rows]

@app.post("/api/payments")
def add_payment(data:schemas.PaymentCreate,db:Session=Depends(get_db),user=Depends(current_user)):
    vehicle=db.query(models.Vehicle).options(joinedload(models.Vehicle.cliente)).filter_by(id=data.vehiculo_id).first()
    if not vehicle: raise HTTPException(404,"Vehículo no encontrado")
    if not vehicle.activo: raise HTTPException(400,"El vehículo está inhabilitado")
    if not vehicle.cliente.activo: raise HTTPException(400,"El cliente está inactivo")
    rate=monthly_rate(vehicle.tipo)
    if rate is None: raise HTTPException(400,"Los pagos de mensualidad solo están disponibles para carros y motos")
    total=rate*data.meses
    if round(data.valor,2)!=total:
        raise HTTPException(400,f"El valor debe ser ${total:,.0f} para {data.meses} mes(es)")
    today=date.today()
    period_start=today
    periods=[]
    for _ in range(data.meses):
        period_end=next_month_end(period_start)
        periods.append((period_start,period_end))
        period_start=period_end+timedelta(days=1)
    if data.periodo_desde!=periods[0][0] or data.periodo_hasta!=periods[-1][1]:
        raise HTTPException(400,"El periodo debe corresponder a los meses consecutivos de la mensualidad")
    m=db.query(models.Membership).filter_by(vehiculo_id=vehicle.id,activa=True).order_by(models.Membership.id.desc()).first()
    if not m:
        m=models.Membership(vehiculo_id=vehicle.id,fecha_inicio=today,fecha_fin=periods[-1][1],valor=rate)
        db.add(m)
        db.flush()
    else:
        m.fecha_fin=max(m.fecha_fin,periods[-1][1])
    rows=[models.Payment(mensualidad_id=m.id,periodo_desde=start,periodo_hasta=end,
      valor=rate,metodo=data.metodo,referencia=data.referencia,recibido_por=user.id) for start,end in periods]
    db.add_all(rows); audit(db,user,"Registró pago",f"Mensualidad {m.id}, {data.meses} mes(es), ${total}"); db.commit()
    return {"message":f"Pago registrado para {data.meses} mes(es)","meses":data.meses,"total":total}

# ENTRADAS / SALIDAS / TRASLADOS
@app.get("/api/movements")
def movements(db:Session=Depends(get_db),user=Depends(current_user),active:bool=False):
    q=db.query(models.Movement).options(joinedload(models.Movement.celda)).filter(models.Movement.tipo_vehiculo.in_(VEHICLE_TYPES)).order_by(models.Movement.id.desc())
    if active: q=q.filter(models.Movement.fecha_salida==None)
    return [{"id":m.id,"placa":m.placa,"tipo_vehiculo":m.tipo_vehiculo,"celda":m.celda.codigo,"fecha_entrada":m.fecha_entrada,"fecha_salida":m.fecha_salida,"observaciones":m.observaciones} for m in q.limit(300).all()]

@app.post("/api/movements/entry")
def entry(data:schemas.EntryCreate,db:Session=Depends(get_db),user=Depends(current_user)):
    if data.tipo_vehiculo not in VEHICLE_TYPES: raise HTTPException(400,"El parqueadero solo recibe carros y motos")
    p=plate(data.placa)
    v=db.query(models.Vehicle).filter_by(placa=p).first()
    if not v or v.tipo != data.tipo_vehiculo: raise HTTPException(400,"Vehículo no registrado o tipo no coincide")
    if not v.activo: raise HTTPException(400,"El vehículo está inhabilitado y no puede ingresar")
    if not v.cliente.activo: raise HTTPException(400,"El cliente está inactivo y no puede ingresar vehículos")
    mship=db.query(models.Membership).filter(models.Membership.vehiculo_id==v.id,models.Membership.activa==True,models.Membership.fecha_inicio<=date.today(),models.Membership.fecha_fin>=date.today()).first()
    if not mship: raise HTTPException(400,"El vehículo no tiene mensualidad vigente")
    lastpay=db.query(models.Payment).filter(
      models.Payment.mensualidad_id==mship.id,
      models.Payment.periodo_desde<=date.today(),
      models.Payment.periodo_hasta>=date.today()
    ).first()
    if not lastpay: raise HTTPException(400,"La mensualidad no tiene un pago que cubra la fecha actual")
    if db.query(models.Movement).filter_by(placa=p,fecha_salida=None).first(): raise HTTPException(409,"La placa ya tiene una ocupación activa")
    c=db.query(models.Cell).filter_by(id=data.celda_id).with_for_update().first()
    if not c or c.estado!="Disponible": raise HTTPException(400,"La celda no está disponible")
    if c.tipo.nombre != v.tipo: raise HTTPException(400,"La celda no es compatible con el vehículo")
    c.estado="Ocupada"
    mov=models.Movement(placa=p,tipo_vehiculo=v.tipo,celda_id=c.id,usuario_entrada_id=user.id,observaciones=data.observaciones)
    db.add(mov); audit(db,user,"Entrada de vehículo",f"{p} - {c.codigo}"); db.commit()
    return {"message":"Entrada registrada","placa":p,"celda":c.codigo}

@app.post("/api/movements/exit")
def exit_vehicle(data:schemas.ExitCreate,db:Session=Depends(get_db),user=Depends(current_user)):
    p=plate(data.placa)
    mov=db.query(models.Movement).filter_by(placa=p,fecha_salida=None).with_for_update().first()
    if not mov: raise HTTPException(404,"No existe una ocupación activa para esa placa")
    c=db.query(models.Cell).filter_by(id=mov.celda_id).with_for_update().first()
    if not c or c.estado!="Ocupada": raise HTTPException(409,"Inconsistencia en el estado de la celda")
    mov.fecha_salida=datetime.now(timezone.utc); mov.usuario_salida_id=user.id; c.estado="Disponible"
    audit(db,user,"Salida de vehículo",f"{p} - {c.codigo}"); db.commit()
    return {"message":"Salida registrada y celda liberada","placa":p,"celda":c.codigo}

@app.post("/api/movements/transfer")
def transfer(data:schemas.TransferCreate,db:Session=Depends(get_db),user=Depends(current_user)):
    p=plate(data.placa)
    mov=db.query(models.Movement).filter_by(placa=p,fecha_salida=None).with_for_update().first()
    if not mov: raise HTTPException(404,"No hay ocupación activa")
    if mov.tipo_vehiculo not in VEHICLE_TYPES: raise HTTPException(400,"El parqueadero solo recibe carros y motos")
    origin=db.query(models.Cell).filter_by(id=mov.celda_id).with_for_update().first()
    dest=db.query(models.Cell).filter_by(id=data.celda_destino_id).with_for_update().first()
    if not dest or dest.estado!="Disponible" or dest.tipo.nombre!=mov.tipo_vehiculo: raise HTTPException(400,"Celda destino no disponible o incompatible")
    origin.estado="Disponible"; dest.estado="Ocupada"
    db.add(models.Transfer(movimiento_id=mov.id,celda_origen_id=origin.id,celda_destino_id=dest.id,usuario_id=user.id))
    mov.celda_id=dest.id; audit(db,user,"Trasladó vehículo",f"{p}: {origin.codigo} -> {dest.codigo}"); db.commit()
    return {"message":"Traslado realizado","origen":origin.codigo,"destino":dest.codigo}

@app.get("/api/audit")
def audit_list(db:Session=Depends(get_db),user=Depends(admin_only)):
    rows=db.query(models.Audit).options(joinedload(models.Audit.usuario)).order_by(models.Audit.id.desc()).limit(300).all()
    return [{"id":a.id,"usuario":a.usuario.username,"accion":a.accion,"detalle":a.detalle,"fecha":a.fecha} for a in rows]
