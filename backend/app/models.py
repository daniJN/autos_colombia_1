from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True)
    nombre_completo = Column(String(140), nullable=False)
    tipo_documento = Column(String(20), nullable=False, default="CC")
    documento = Column(String(30), unique=True, nullable=False)
    telefono = Column(String(30), default="")
    correo = Column(String(160), default="")
    username = Column(String(60), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(20), nullable=False, default="Operario")
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CellType(Base):
    __tablename__ = "tipos_celda"
    id = Column(Integer, primary_key=True)
    nombre = Column(String(40), unique=True, nullable=False)
    activo = Column(Boolean, default=True)

class Cell(Base):
    __tablename__ = "celdas"
    id = Column(Integer, primary_key=True)
    codigo = Column(String(30), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    tipo_id = Column(Integer, ForeignKey("tipos_celda.id"), nullable=False)
    estado = Column(String(20), default="Disponible", nullable=False)
    tipo = relationship("CellType")

class Customer(Base):
    __tablename__ = "clientes"
    id = Column(Integer, primary_key=True)
    nombre = Column(String(140), nullable=False)
    documento = Column(String(30), unique=True, nullable=False)
    telefono = Column(String(30), default="")
    correo = Column(String(160), default="")
    activo = Column(Boolean, default=True)

class Vehicle(Base):
    __tablename__ = "vehiculos"
    id = Column(Integer, primary_key=True)
    placa = Column(String(12), unique=True, nullable=False)
    tipo = Column(String(30), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    activo = Column(Boolean, default=True, nullable=False, server_default="true")
    cliente = relationship("Customer")

class Membership(Base):
    __tablename__ = "mensualidades"
    id = Column(Integer, primary_key=True)
    vehiculo_id = Column(Integer, ForeignKey("vehiculos.id"), nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    valor = Column(Numeric(12,2), nullable=False)
    celda_fija_id = Column(Integer, ForeignKey("celdas.id"), nullable=True)
    activa = Column(Boolean, default=True)
    vehiculo = relationship("Vehicle")
    celda_fija = relationship("Cell")

class Payment(Base):
    __tablename__ = "pagos"
    id = Column(Integer, primary_key=True)
    mensualidad_id = Column(Integer, ForeignKey("mensualidades.id"), nullable=False)
    fecha_pago = Column(DateTime(timezone=True), server_default=func.now())
    periodo_desde = Column(Date, nullable=False)
    periodo_hasta = Column(Date, nullable=False)
    valor = Column(Numeric(12,2), nullable=False)
    metodo = Column(String(30), nullable=False)
    referencia = Column(String(100), default="")
    recibido_por = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    mensualidad = relationship("Membership")
    usuario = relationship("User")

class Movement(Base):
    __tablename__ = "movimientos"
    id = Column(Integer, primary_key=True)
    placa = Column(String(12), nullable=False, index=True)
    tipo_vehiculo = Column(String(30), nullable=False)
    celda_id = Column(Integer, ForeignKey("celdas.id"), nullable=False)
    fecha_entrada = Column(DateTime(timezone=True), server_default=func.now())
    fecha_salida = Column(DateTime(timezone=True), nullable=True)
    usuario_entrada_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    usuario_salida_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    observaciones = Column(Text, default="")
    celda = relationship("Cell")

class Transfer(Base):
    __tablename__ = "traslados"
    id = Column(Integer, primary_key=True)
    movimiento_id = Column(Integer, ForeignKey("movimientos.id"), nullable=False)
    celda_origen_id = Column(Integer, ForeignKey("celdas.id"), nullable=False)
    celda_destino_id = Column(Integer, ForeignKey("celdas.id"), nullable=False)
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

class Audit(Base):
    __tablename__ = "auditoria_log"
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    accion = Column(String(100), nullable=False)
    detalle = Column(Text, default="")
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    usuario = relationship("User")
