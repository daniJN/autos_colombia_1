import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
 selector:'app-root', standalone:true, imports:[CommonModule,FormsModule],
 template:`
 <section class="login-wrap" *ngIf="!token">
   <div class="login-card">
     <div class="brand-mark">🚘</div><h1>Autos Colombia</h1><p class="muted">Sistema de gestión de parqueadero</p>
     <form (ngSubmit)="login()"><label for="loginUsername">Usuario</label><input id="loginUsername" [(ngModel)]="loginData.username" name="username" placeholder="Escribe tu usuario" required>
       <label for="loginPassword">Contraseña</label><div class="password-field"><input id="loginPassword" [type]="showLoginPassword?'text':'password'" [(ngModel)]="loginData.password" name="password" placeholder="Escribe tu contraseña" required><button type="button" class="light password-toggle" (click)="showLoginPassword=!showLoginPassword">{{showLoginPassword?'Ocultar':'Ver'}}</button></div>
       <button class="primary full">Ingresar al sistema</button></form>
     <p class="hint">Acceso inicial: admin / Admin12345</p><p class="error" *ngIf="error">{{error}}</p>
   </div>
 </section>
 <div class="layout" *ngIf="token">
   <aside class="sidebar">
     <div class="brand"><span>🚘</span><div><b>Autos Colombia</b><small>Gestión de parqueadero</small></div></div>
     <div class="user-mini"><div class="avatar">{{user?.nombre_completo?.charAt(0)}}</div><div><b>{{user?.nombre_completo}}</b><small>{{user?.rol}}</small></div></div>
     <nav>
       <button *ngFor="let item of menu" [class.selected]="section===item.id" (click)="go(item.id)" [hidden]="item.admin && user?.rol!=='Administrador'">{{item.icon}} {{item.label}}</button>
     </nav>
     <button class="logout" (click)="logout()">↪ Cerrar sesión</button>
   </aside>
   <main class="main">
     <header><div><span class="eyebrow">PANEL DE CONTROL</span><h2>{{title()}}</h2></div></header>
     <div class="alert" *ngIf="message">{{message}}</div><div class="alert error-bg" *ngIf="error">{{error}}</div>

     <section *ngIf="section==='dashboard'">
       <div class="stats">
         <article><span>Total celdas</span><strong>{{stats.celdas||0}}</strong><small>Capacidad registrada</small></article>
         <article><span>Disponibles</span><strong class="green">{{stats.disponibles||0}}</strong><small>Listas para asignar</small></article>
         <article><span>Ocupadas</span><strong class="red">{{stats.ocupadas||0}}</strong><small>Vehículos dentro</small></article>
         <article><span>Vehículos activos</span><strong>{{stats.vehiculos_activos||0}}</strong><small>Ocupaciones abiertas</small></article>
       </div>
       <div class="panel"><div class="panel-head"><h3>Estado de las celdas</h3><button class="light" (click)="loadCells()">Actualizar</button></div>
       <div class="cell-grid"><div *ngFor="let c of cells" class="cell" [class.occupied]="c.estado==='Ocupada'" [class.disabled]="c.estado==='Inhabilitada'"><b>{{c.codigo}}</b><small>{{c.tipo}}</small><span>{{c.estado}}</span><small *ngIf="c.placa">{{c.placa}}</small></div></div></div>
     </section>

     <section *ngIf="section==='users'">
       <div class="panel" *ngIf="isAdmin"><div class="panel-head"><h3>Registrar usuario</h3></div>
       <form class="form-grid" (ngSubmit)="createUser()">
         <div class="form-field"><label for="userFullName">Nombre completo</label><input id="userFullName" placeholder="Ej. María Pérez" [(ngModel)]="newUser.nombre_completo" name="un" required></div>
         <div class="form-field"><label for="userDocumentType">Tipo de documento</label><input id="userDocumentType" placeholder="CC" [(ngModel)]="newUser.tipo_documento" name="ut"></div>
         <div class="form-field"><label for="userDocument">Número de documento</label><input id="userDocument" placeholder="Escribe el documento" [(ngModel)]="newUser.documento" name="ud" required></div>
         <div class="form-field"><label for="userPhone">Teléfono</label><input id="userPhone" placeholder="Escribe el teléfono" [(ngModel)]="newUser.telefono" name="up"></div>
         <div class="form-field"><label for="userEmail">Correo electrónico</label><input id="userEmail" type="email" placeholder="nombre@correo.com" [(ngModel)]="newUser.correo" name="ue" required></div>
         <div class="form-field"><label for="newUsername">Nombre de usuario</label><input id="newUsername" placeholder="Elige un usuario para iniciar sesión" [(ngModel)]="newUser.username" name="uu" required></div>
         <div class="form-field"><label for="newUserPassword">Contraseña</label><div class="password-field"><input id="newUserPassword" [type]="showUserPassword?'text':'password'" placeholder="Mínimo 8 caracteres" [(ngModel)]="newUser.password" name="pw" minlength="8" required><button type="button" class="light password-toggle" (click)="showUserPassword=!showUserPassword">{{showUserPassword?'Ocultar':'Ver'}}</button></div><small class="field-hint">Debe tener al menos 8 caracteres e incluir letras y números.</small></div>
         <div class="form-field"><label for="userRole">Rol del usuario</label><select id="userRole" [(ngModel)]="newUser.rol" name="ur"><option>Operario</option><option>Administrador</option></select></div>
         <button class="primary">+ Crear usuario</button>
       </form></div>
       <div class="panel"><div class="panel-head"><h3>Usuarios del sistema</h3><input class="search" placeholder="Buscar usuario..." [(ngModel)]="search" (input)="loadUsers()"></div>
       <div class="table-scroll"><table><thead><tr><th>Nombre</th><th>Documento</th><th>Usuario</th><th>Rol</th><th>Estado</th><th *ngIf="isAdmin">Acción</th></tr></thead>
       <tbody><tr *ngFor="let u of visibleUsers"><td>{{u.nombre_completo}}</td><td>{{u.documento}}</td><td>{{u.username}}</td><td>{{u.rol}}</td><td><span class="pill" [class.off]="!u.activo">{{u.activo?'Activo':'Inactivo'}}</span></td><td *ngIf="isAdmin"><button class="light" (click)="toggleUser(u)">{{u.activo?'Desactivar':'Activar'}}</button></td></tr></tbody></table></div></div>
     </section>

     <section *ngIf="section==='cells'">
       <div class="panel" *ngIf="isAdmin"><h3>Registrar celda</h3><form class="form-grid" (ngSubmit)="createCell()">
         <div class="form-field"><label for="cellCode">Código de la celda *</label><input id="cellCode" placeholder="Ej. C-01" [(ngModel)]="newCell.codigo" name="cc" required><small class="field-hint">Identificador único, por ejemplo C-01.</small></div>
         <div class="form-field"><label for="cellName">Nombre o zona *</label><input id="cellName" placeholder="Ej. Zona norte" [(ngModel)]="newCell.nombre" name="cn" required><small class="field-hint">Indica dónde está ubicada.</small></div>
         <div class="form-field"><label for="cellType">Tipo de vehículo permitido *</label><select id="cellType" [(ngModel)]="newCell.tipo" name="ct" required><option>Carro</option><option>Moto</option></select></div>
         <div class="form-field"><label for="cellStatus">Estado inicial *</label><select id="cellStatus" [(ngModel)]="newCell.estado" name="ce" required><option>Disponible</option><option>Inhabilitada</option></select></div><button class="primary">+ Registrar celda</button>
       </form></div>
       <div class="panel"><div class="panel-head"><h3>Inventario de celdas</h3><div><select [(ngModel)]="cellFilter" (change)="loadCells()"><option value="">Todos los estados</option><option>Disponible</option><option>Ocupada</option><option>Inhabilitada</option></select></div></div>
       <div class="cell-grid"><div *ngFor="let c of cells" class="cell" [class.occupied]="c.estado==='Ocupada'" [class.disabled]="c.estado==='Inhabilitada'"><b>{{c.codigo}}</b><small>{{c.nombre}} · {{c.tipo}}</small><span>{{c.estado}}</span><strong *ngIf="c.placa">{{c.placa}}</strong><button *ngIf="isAdmin && c.estado!=='Ocupada'" class="tiny" (click)="toggleCell(c)">{{c.estado==='Disponible'?'Inhabilitar':'Habilitar'}}</button></div></div></div>
     </section>

     <section *ngIf="section==='movements'">
       <div class="two-col">
        <div class="panel"><h3>Registrar entrada</h3><p class="form-note">Solo pueden ingresar vehículos con mensualidad pagada y vigente.</p><p class="field-hint error" *ngIf="!entryEligibleVehicles.length">No hay vehículos con una mensualidad vigente y pagada.</p><form (ngSubmit)="entry()"><label for="entryVehicle">Placa · tipo</label><select id="entryVehicle" [(ngModel)]="entryData.placa" name="ep" required (ngModelChange)="onEntryVehicleChange()"><option value="">Seleccione un vehículo</option><option *ngFor="let v of entryEligibleVehicles" [value]="v.placa">{{v.placa}} · {{v.tipo}}</option></select><label for="entryCell">Celda disponible</label><select id="entryCell" [(ngModel)]="entryData.celda_id" name="ec" required><option [ngValue]="0">Seleccione una celda</option><option *ngFor="let c of availableCells(entryData.tipo_vehiculo)" [ngValue]="c.id">{{c.codigo}} - {{c.nombre}}</option></select><label for="entryNotes">Observaciones</label><input id="entryNotes" [(ngModel)]="entryData.observaciones" name="eo" placeholder="Opcional"><button class="primary full" [disabled]="!entryData.placa || !entryData.celda_id || !entryEligibleVehicles.length">Registrar ingreso</button></form></div>
        <div class="panel"><h3>Registrar salida</h3><form (ngSubmit)="exit()"><label>Placa</label><input [(ngModel)]="exitPlate" name="xp" placeholder="ABC123" required><button class="danger full">Registrar salida y liberar celda</button></form><hr><h3>Trasladar vehículo</h3><form (ngSubmit)="transfer()"><label>Placa activa</label><input [(ngModel)]="transferData.placa" name="tp" required><label>Celda destino</label><select [(ngModel)]="transferData.celda_destino_id" name="td"><option [ngValue]="0">Seleccione</option><option *ngFor="let c of cells.filter(isAvailable)" [ngValue]="c.id">{{c.codigo}} · {{c.tipo}}</option></select><button class="light full">Realizar traslado</button></form></div>
       </div>
       <div class="panel"><div class="panel-head"><h3>Historial de movimientos</h3><button class="light" (click)="loadMovements()">Actualizar</button></div><div class="table-scroll"><table><thead><tr><th>Placa</th><th>Tipo</th><th>Celda</th><th>Entrada</th><th>Salida</th><th>Estado</th></tr></thead><tbody><tr *ngFor="let m of movements"><td><b>{{m.placa}}</b></td><td>{{m.tipo_vehiculo}}</td><td>{{m.celda}}</td><td>{{m.fecha_entrada|date:'short'}}</td><td>{{m.fecha_salida?(m.fecha_salida|date:'short'):'-'}}</td><td><span class="pill" [class.off]="m.fecha_salida">{{m.fecha_salida?'Finalizado':'Activo'}}</span></td></tr></tbody></table></div></div>
     </section>

     <section *ngIf="section==='customers'">
       <div class="panel"><h3>{{editingCustomerId ? 'Actualizar cliente' : 'Registrar cliente'}}</h3><form class="form-grid" novalidate (ngSubmit)="saveCustomer()"><div class="form-field"><label for="customerName">Nombre completo *</label><input id="customerName" placeholder="Ej. Juan Pérez" [(ngModel)]="newCustomer.nombre" name="n"><small class="field-hint">Dato obligatorio.</small></div><div class="form-field"><label for="customerDocument">Número de documento *</label><input id="customerDocument" placeholder="Escribe el documento" [(ngModel)]="newCustomer.documento" name="d"><small class="field-hint">Dato obligatorio y único.</small></div><div class="form-field"><label for="customerPhone">Teléfono</label><input id="customerPhone" placeholder="Escribe el teléfono" [(ngModel)]="newCustomer.telefono" name="t"></div><div class="form-field"><label for="customerEmail">Correo electrónico</label><input id="customerEmail" type="email" placeholder="nombre@correo.com" [(ngModel)]="newCustomer.correo" name="e"></div><button class="primary">{{editingCustomerId ? 'Actualizar cliente' : 'Guardar cliente'}}</button><button *ngIf="editingCustomerId" type="button" class="light" (click)="cancelCustomerEdit()">Cancelar</button></form></div>
       <div class="panel"><h3>{{editingVehicleId ? 'Actualizar vehículo' : 'Registrar vehículo'}}</h3><form class="form-grid" novalidate (ngSubmit)="saveVehicle()"><div class="form-field"><label for="vehiclePlate">Placa *</label><input id="vehiclePlate" placeholder="Ej. ABC123" [(ngModel)]="newVehicle.placa" name="p"><small class="field-hint">Dato obligatorio.</small></div><div class="form-field"><label for="vehicleType">Tipo de vehículo *</label><select id="vehicleType" [(ngModel)]="newVehicle.tipo" name="vt"><option>Carro</option><option>Moto</option></select></div><div class="form-field"><label for="vehicleCustomer">Propietario *</label><select id="vehicleCustomer" [(ngModel)]="newVehicle.cliente_id" name="vc"><option [ngValue]="0" disabled>Seleccione el cliente</option><option *ngFor="let c of customers" [ngValue]="c.id" [disabled]="!c.activo && c.id!==newVehicle.cliente_id">{{c.nombre}} - {{c.documento}}{{c.activo?'':' (Inactivo)'}}</option></select><small class="field-hint" *ngIf="!activeCustomers.length">Registra o activa un cliente antes de continuar.</small></div><button class="primary">{{editingVehicleId ? 'Actualizar vehículo' : 'Registrar vehículo'}}</button><button *ngIf="editingVehicleId" type="button" class="light" (click)="cancelVehicleEdit()">Cancelar</button></form></div>
       <div class="panel"><div class="panel-head"><h3>Clientes</h3></div><div class="management-grid"><article *ngFor="let c of customers" class="management-card" [class.disabled]="!c.activo"><div class="management-card-head"><b>{{c.nombre}}</b><span class="management-status" [class.off]="!c.activo">{{c.activo?'Activo':'Inhabilitado'}}</span></div><small>Documento: {{c.documento}}</small><small>Teléfono: {{c.telefono||'No registrado'}}</small><small>Correo: {{c.correo||'No registrado'}}</small><div class="management-actions" *ngIf="isAdmin"><button class="tiny" (click)="editCustomer(c)">Actualizar</button><button class="tiny" (click)="toggleCustomer(c)">{{c.activo?'Inhabilitar':'Habilitar'}}</button></div></article><p class="empty-management" *ngIf="!customers.length">No hay clientes registrados.</p></div></div>
       <div class="panel"><div class="panel-head"><h3>Vehículos registrados</h3></div><div class="management-grid"><article *ngFor="let v of vehicles" class="management-card" [class.disabled]="!v.activo || !v.cliente_activo"><div class="management-card-head"><b>{{v.placa}}</b><span class="management-status" [class.off]="!v.activo || !v.cliente_activo">{{!v.activo?'Inhabilitado':v.cliente_activo?'Activo':'Cliente inhabilitado'}}</span></div><small>Tipo: {{v.tipo}}</small><small>Cliente: {{v.cliente}}</small><div class="management-actions" *ngIf="isAdmin"><button class="tiny" (click)="editVehicle(v)">Actualizar</button><button class="tiny" (click)="toggleVehicle(v)">{{v.activo?'Inhabilitar':'Habilitar'}}</button></div></article><p class="empty-management" *ngIf="!vehicles.length">No hay vehículos registrados.</p></div></div>
     </section>

     <section *ngIf="section==='memberships'">
       <div class="stats membership-stats">
         <article><span>Total de clientes</span><strong>{{customers.length}}</strong><small>Clientes registrados</small></article>
         <article><span>Clientes activos</span><strong class="green">{{activeCustomerCount}}</strong><small>Con estado activo</small></article>
         <article><span>Clientes inactivos</span><strong class="red">{{inactiveCustomerCount}}</strong><small>Con estado inactivo</small></article>
         <article><span>Vehículos registrados</span><strong>{{vehicles.length}}</strong><small>Carros y motos</small></article>
       </div>
     </section>

     <section *ngIf="section==='payments'">
       <div class="payment-tabs">
         <button [class.selected]="paymentView==='register'" (click)="paymentView='register'">Registrar pago</button>
         <button [class.selected]="paymentView==='consult'" (click)="paymentView='consult'">Consultar pagos</button>
         <button [class.selected]="paymentView==='pending'" (click)="paymentView='pending'">Mensualidades pendientes</button>
         <button [class.selected]="paymentView==='statement'" (click)="paymentView='statement'">Estado de cuenta</button>
         <button *ngIf="isAdmin" [class.selected]="paymentView==='report'" (click)="paymentView='report'">Reporte de pagos</button>
       </div>
       <div class="panel" *ngIf="paymentView==='register'"><h3>Registrar pago de mensualidad</h3><p class="form-note">El periodo comienza en la fecha de registro del pago. Cada mes adicional se activa al terminar el anterior. Tarifas mensuales: carro $250.000 · moto $100.000.</p><p class="field-hint error" *ngIf="!eligibleVehicles.length">No hay carros o motos de clientes activos para pagar.</p><form class="form-grid" (ngSubmit)="createPayment()">
         <div class="form-field"><label for="paymentVehicle">Placa del vehículo (carro o moto)</label><select id="paymentVehicle" [(ngModel)]="newPayment.vehiculo_id" name="vehicle" required (ngModelChange)="onPaymentVehicleChange()"><option [ngValue]="0" disabled>Seleccione la placa</option><option *ngFor="let v of eligibleVehicles" [ngValue]="v.id">{{v.placa}} · {{v.tipo}}</option></select><small class="field-hint" *ngIf="eligibleVehicles.length">Selecciona la placa y la cantidad de meses que vas a pagar.</small></div>
         <div class="form-field"><label for="paymentDate">Fecha en que se registra el pago</label><input id="paymentDate" type="date" [value]="todayDate" disabled></div>
         <div class="form-field"><label for="paymentMonths">¿Cuántos meses va a pagar? (máximo 12)</label><select id="paymentMonths" [(ngModel)]="newPayment.meses" name="months" required (ngModelChange)="onPaymentMonthsChange()"><option *ngFor="let count of monthOptions" [ngValue]="count">{{count}} mes(es)</option></select></div>
         <div class="form-field"><label for="paymentStart">Periodo total desde</label><input id="paymentStart" type="date" [(ngModel)]="newPayment.periodo_desde" name="pd" readonly></div>
         <div class="form-field"><label for="paymentEnd">Periodo total hasta</label><input id="paymentEnd" type="date" [(ngModel)]="newPayment.periodo_hasta" name="ph" readonly></div>
         <div class="form-field"><label for="paymentValue">Total del pago (COP)</label><input id="paymentValue" type="number" [(ngModel)]="newPayment.valor" name="pv" readonly><small class="field-hint">Tarifa mensual multiplicada por la cantidad de meses.</small></div>
         <div class="form-field"><label for="paymentMethod">Método de pago</label><select id="paymentMethod" [(ngModel)]="newPayment.metodo" name="method"><option>Efectivo</option><option>Transferencia</option><option>Consignación</option><option>Otro</option></select></div>
         <div class="form-field"><label for="paymentReference">Referencia o comprobante (opcional)</label><input id="paymentReference" placeholder="Número de comprobante, si aplica" [(ngModel)]="newPayment.referencia" name="ref"></div>
         <div class="payment-total" *ngIf="newPayment.valor"><span>Total a pagar</span><strong>{{newPayment.valor|currency:'COP':'symbol':'1.0-0'}}</strong></div>
         <button class="primary" [disabled]="!newPayment.vehiculo_id || !newPayment.valor">Registrar pago</button></form>
         <div class="payment-schedule" *ngIf="paymentPeriods.length"><b>Periodos que quedarán registrados:</b><div *ngFor="let period of paymentPeriods"><span>Mes {{period.numero}}: {{period.desde|date:'shortDate'}} – {{period.hasta|date:'shortDate'}}</span><small>Se activa el {{period.desde|date:'shortDate'}}</small></div></div>
       </div>
       <div class="panel" *ngIf="paymentView==='consult'"><div class="panel-head"><h3>Pagos registrados</h3><input class="search" placeholder="Filtrar por placa" [(ngModel)]="paymentSearch"></div><div class="table-scroll"><table><thead><tr><th>Fecha de pago</th><th>Placa</th><th>Periodo</th><th>Valor</th><th>Estado</th><th>Método</th><th>Recibido por</th><th>Comprobante</th></tr></thead><tbody><tr *ngFor="let p of filteredPayments"><td>{{p.fecha_pago|date:'short'}}</td><td>{{p.placa}}</td><td>{{p.periodo_desde|date:'shortDate'}} - {{p.periodo_hasta|date:'shortDate'}}</td><td>{{p.valor|currency:'COP':'symbol':'1.0-0'}}</td><td>{{paymentStatus(p)}}</td><td>{{p.metodo}}</td><td>{{p.recibido_por}}</td><td><button class="light" (click)="generateReceipt(p)">Generar comprobante</button></td></tr><tr *ngIf="!filteredPayments.length"><td colspan="8">No hay pagos que coincidan con la consulta.</td></tr></tbody></table></div></div>
       <div class="panel" *ngIf="paymentView==='pending'"><h3>Mensualidades pendientes</h3><p class="form-note">Vehículos sin periodos pagados vigentes ni pagos programados.</p><div class="table-scroll"><table><thead><tr><th>Placa</th><th>Tipo</th><th>Tarifa mensual</th><th>Estado</th><th>Vencimiento</th></tr></thead><tbody><tr *ngFor="let m of pendingMemberships"><td>{{m.placa}}</td><td>{{m.tipo}}</td><td>{{m.valor|currency:'COP':'symbol':'1.0-0'}}</td><td>{{membershipStatus(m)}}</td><td>{{m.fecha_fin?(m.fecha_fin|date:'shortDate'):'Sin pagos registrados'}}</td></tr><tr *ngIf="!pendingMemberships.length"><td colspan="5">No hay mensualidades pendientes.</td></tr></tbody></table></div></div>
       <div class="panel" *ngIf="paymentView==='statement'"><h3>Consultar estado de cuenta</h3><div class="form-field statement-select"><label for="statementVehicle">Placa del vehículo</label><select id="statementVehicle" [(ngModel)]="statementVehicleId" name="statementVehicle"><option [ngValue]="0">Seleccione una placa</option><option *ngFor="let v of eligibleVehicles" [ngValue]="v.id">{{v.placa}} · {{v.tipo}}</option></select></div><div class="statement-summary" *ngIf="selectedStatementVehicle as vehicle"><article><small>Vehículo</small><b>{{vehicle.placa}} · {{vehicle.tipo}}</b></article><article><small>Meses pagados</small><b>{{statementPayments.length}}</b></article><article><small>Total pagado</small><b>{{statementTotal|currency:'COP':'symbol':'1.0-0'}}</b></article><article><small>Estado</small><b>{{statementMembership?membershipStatus(statementMembership):'Pendiente de pago'}}</b></article></div><div class="table-scroll" *ngIf="statementVehicleId"><table><thead><tr><th>Fecha de pago</th><th>Periodo</th><th>Valor</th><th>Estado</th></tr></thead><tbody><tr *ngFor="let p of statementPayments"><td>{{p.fecha_pago|date:'short'}}</td><td>{{p.periodo_desde|date:'shortDate'}} - {{p.periodo_hasta|date:'shortDate'}}</td><td>{{p.valor|currency:'COP':'symbol':'1.0-0'}}</td><td>{{paymentStatus(p)}}</td></tr><tr *ngIf="!statementPayments.length"><td colspan="4">No hay pagos registrados para esta placa.</td></tr></tbody></table></div></div>
       <div class="panel" *ngIf="paymentView==='report' && isAdmin"><div class="panel-head"><h3>Reporte de pagos</h3><button class="primary" (click)="printPaymentReport()" [disabled]="!reportPayments.length">Imprimir / Guardar PDF</button></div><div class="form-grid report-filters"><div class="form-field"><label for="reportStart">Pagos desde</label><input id="reportStart" type="date" [(ngModel)]="reportStart" name="reportStart"></div><div class="form-field"><label for="reportEnd">Pagos hasta</label><input id="reportEnd" type="date" [(ngModel)]="reportEnd" name="reportEnd"></div><div class="form-field"><label for="reportPlate">Placa (opcional)</label><input id="reportPlate" placeholder="Filtrar por placa" [(ngModel)]="reportPlate" name="reportPlate"></div></div><div class="report-total">Pagos: <b>{{reportPayments.length}}</b> · Total recibido: <b>{{reportTotal|currency:'COP':'symbol':'1.0-0'}}</b></div><div class="table-scroll"><table><thead><tr><th>Fecha</th><th>Placa</th><th>Periodo</th><th>Valor</th><th>Método</th><th>Recibido por</th></tr></thead><tbody><tr *ngFor="let p of reportPayments"><td>{{p.fecha_pago|date:'short'}}</td><td>{{p.placa}}</td><td>{{p.periodo_desde|date:'shortDate'}} - {{p.periodo_hasta|date:'shortDate'}}</td><td>{{p.valor|currency:'COP':'symbol':'1.0-0'}}</td><td>{{p.metodo}}</td><td>{{p.recibido_por}}</td></tr><tr *ngIf="!reportPayments.length"><td colspan="6">No hay pagos para los filtros seleccionados.</td></tr></tbody></table></div></div>
       <div class="print-area receipt-print" *ngIf="printMode==='receipt' && receiptPayment as receipt"><h1>Autos Colombia</h1><h2>Comprobante de pago #{{receipt.id}}</h2><p><b>Fecha de pago:</b> {{receipt.fecha_pago|date:'short'}}</p><p><b>Placa:</b> {{receipt.placa}}</p><p><b>Periodo pagado:</b> {{receipt.periodo_desde|date:'longDate'}} al {{receipt.periodo_hasta|date:'longDate'}}</p><p><b>Valor recibido:</b> {{receipt.valor|currency:'COP':'symbol':'1.0-0'}}</p><p><b>Método:</b> {{receipt.metodo}}</p><p><b>Referencia:</b> {{receipt.referencia||'No registrada'}}</p><p><b>Recibido por:</b> {{receipt.recibido_por}}</p></div>
       <div class="print-area report-print" *ngIf="printMode==='report'"><h1>Autos Colombia</h1><h2>Reporte de pagos</h2><p>Generado: {{todayDate|date:'longDate'}} · Periodo: {{reportStart||'Todos'}} a {{reportEnd||'Todos'}}</p><p>Placa: {{reportPlate||'Todas'}} · Pagos: {{reportPayments.length}} · Total recibido: {{reportTotal|currency:'COP':'symbol':'1.0-0'}}</p><table><thead><tr><th>Fecha de pago</th><th>Placa</th><th>Periodo pagado</th><th>Valor</th><th>Método</th><th>Recibido por</th></tr></thead><tbody><tr *ngFor="let p of reportPayments"><td>{{p.fecha_pago|date:'short'}}</td><td>{{p.placa}}</td><td>{{p.periodo_desde|date:'shortDate'}} - {{p.periodo_hasta|date:'shortDate'}}</td><td>{{p.valor|currency:'COP':'symbol':'1.0-0'}}</td><td>{{p.metodo}}</td><td>{{p.recibido_por}}</td></tr></tbody></table></div>
     </section>

     <section *ngIf="section==='audit'"><div class="panel"><h3>Auditoría del sistema</h3><div class="table-scroll"><table><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr><tr *ngFor="let a of audit"><td>{{a.fecha|date:'short'}}</td><td>{{a.usuario}}</td><td>{{a.accion}}</td><td>{{a.detalle}}</td></tr></table></div></div></section>

     <section *ngIf="section==='profile'"><div class="panel narrow"><h3>Cambiar mi contraseña</h3><form (ngSubmit)="changePassword()"><label for="currentPassword">Contraseña actual</label><div class="password-field"><input id="currentPassword" [type]="showCurrentPassword?'text':'password'" [(ngModel)]="passwordData.actual" name="old" placeholder="Escribe tu contraseña actual"><button type="button" class="light password-toggle" (click)="showCurrentPassword=!showCurrentPassword">{{showCurrentPassword?'Ocultar':'Ver'}}</button></div><label for="newPassword">Nueva contraseña</label><div class="password-field"><input id="newPassword" [type]="showNewPassword?'text':'password'" [(ngModel)]="passwordData.nueva" name="new" placeholder="Mínimo 8 caracteres, letras y números"><button type="button" class="light password-toggle" (click)="showNewPassword=!showNewPassword">{{showNewPassword?'Ocultar':'Ver'}}</button></div><button class="primary full">Actualizar contraseña</button></form></div></section>
   </main>
 </div>
 `
})
export class AppComponent {
 api='http://localhost:8000/api'; token=localStorage.getItem('ac_token')||''; user:any=JSON.parse(localStorage.getItem('ac_user')||'null');
 section='dashboard'; message=''; error=''; search=''; cellFilter='';
 paymentView='register'; paymentSearch=''; statementVehicleId=0; reportStart=''; reportEnd=''; reportPlate=''; receiptPayment:any=null; printMode='';
 showLoginPassword=false; showUserPassword=false; showCurrentPassword=false; showNewPassword=false;
 loginData:any={username:'admin',password:'Admin12345'};
 stats:any={}; users:any[]=[]; cells:any[]=[]; movements:any[]=[]; customers:any[]=[]; vehicles:any[]=[]; memberships:any[]=[]; payments:any[]=[]; audit:any[]=[];
 newUser:any={nombre_completo:'',tipo_documento:'CC',documento:'',telefono:'',correo:'',username:'',password:'',rol:'Operario'};
 newCell:any={codigo:'',nombre:'',tipo:'Carro',estado:'Disponible'};
 newCustomer:any={nombre:'',documento:'',telefono:'',correo:''};
 editingCustomerId:number|null=null;
 editingVehicleId:number|null=null;
 newVehicle:any={placa:'',tipo:'Carro',cliente_id:0};
 todayDate=this.localToday();
 newPayment:any={vehiculo_id:0,periodo_desde:'',periodo_hasta:'',valor:null,meses:1,metodo:'Efectivo',referencia:''};
 monthOptions=Array.from({length:12},(_,index)=>index+1);
 paymentPeriods:any[]=[];
 entryData:any={placa:'',tipo_vehiculo:'Carro',celda_id:0,observaciones:''}; exitPlate=''; transferData:any={placa:'',celda_destino_id:0}; passwordData:any={actual:'',nueva:''};
 menu:any[]=[
 {id:'dashboard',label:'Inicio',icon:'⌂'},{id:'users',label:'Usuarios',icon:'♙',admin:true},
 {id:'cells',label:'Celdas',icon:'▦'},{id:'movements',label:'Entradas y salidas',icon:'⇄'},
 {id:'customers',label:'Clientes',icon:'♧'},{id:'memberships',label:'Resumen de clientes',icon:'▣'},
 {id:'payments',label:'Pagos',icon:'＄'},{id:'audit',label:'Auditoría',icon:'☷',admin:true},
 {id:'profile',label:'Mi perfil',icon:'⚙'}
 ];
 constructor(private http:HttpClient){if(this.token)this.loadAll();}
 get isAdmin(){return this.user?.rol==='Administrador';}
 get eligibleVehicles(){return this.vehicles.filter(v=>v.activo&&v.cliente_activo&&(v.tipo==='Carro'||v.tipo==='Moto'));}
 get entryEligibleVehicles(){return this.eligibleVehicles.filter(vehicle=>this.memberships.some(m=>m.vehiculo_id===vehicle.id&&m.activa&&m.cliente_activo&&String(m.fecha_inicio).slice(0,10)<=this.todayDate&&String(m.fecha_fin).slice(0,10)>=this.todayDate&&this.payments.some(p=>p.mensualidad_id===m.id&&String(p.periodo_desde).slice(0,10)<=this.todayDate&&String(p.periodo_hasta).slice(0,10)>=this.todayDate)));}
 get filteredPayments(){const search=this.paymentSearch.trim().toUpperCase();return this.payments.filter(p=>!search||p.placa.toUpperCase().includes(search));}
 get pendingMemberships(){return this.memberships.filter(m=>m.cliente_activo&&['Pendiente de pago','Vencida · pendiente de pago'].includes(this.membershipStatus(m)));}
 get selectedStatementVehicle(){return this.eligibleVehicles.find(v=>v.id===this.statementVehicleId)||null;}
 get statementMembership(){return this.memberships.find(m=>m.vehiculo_id===this.statementVehicleId)||null;}
 get statementPayments(){return this.payments.filter(p=>p.vehiculo_id===this.statementVehicleId).sort((a,b)=>String(a.periodo_desde).localeCompare(String(b.periodo_desde)));}
 get statementTotal(){return this.statementPayments.reduce((total,p)=>total+Number(p.valor),0);}
 get reportPayments(){const start=this.reportStart;const end=this.reportEnd;const plate=this.reportPlate.trim().toUpperCase();return this.payments.filter(p=>{const paid=String(p.fecha_pago).slice(0,10);return(!start||paid>=start)&&(!end||paid<=end)&&(!plate||p.placa.toUpperCase().includes(plate));}).sort((a,b)=>String(b.fecha_pago).localeCompare(String(a.fecha_pago)));}
 get reportTotal(){return this.reportPayments.reduce((total,p)=>total+Number(p.valor),0);}
 get activeCustomers(){return this.customers.filter(c=>c.activo);}
 get activeCustomerCount(){return this.customers.filter(c=>c.activo).length;}
 get inactiveCustomerCount(){return this.customers.filter(c=>!c.activo).length;}
 get visibleUsers(){return this.users.filter(u=>u.id!==this.user?.id);}
 headers(){return new HttpHeaders({Authorization:`Bearer ${this.token}`});}
 request(method:string,path:string,body:any=null,ok?: (r:any)=>void){
   this.error='';this.message='';
   const opts:any={headers:this.headers()};
   const req=method==='GET'?this.http.get(this.api+path,opts):method==='POST'?this.http.post(this.api+path,body,opts):this.http.put(this.api+path,body,opts);
   req.subscribe({next:(r:any)=>{this.message=r?.message||'Operación realizada correctamente';if(ok)ok(r);this.loadCore();},error:e=>{this.error=this.apiError(e,'No fue posible completar la operación');}});
 }
 apiError(e:any,fallback:string){const detail=e?.error?.detail;if(typeof detail==='string')return detail;if(Array.isArray(detail))return detail.map(item=>String(item.msg||'Dato inválido').replace(/^Value error,\s*/,'')).join('. ');return fallback;}
 login(){this.error='';this.http.post<any>(this.api+'/auth/login',this.loginData).subscribe({next:r=>{this.token=r.access_token;this.user=r.user;localStorage.setItem('ac_token',this.token);localStorage.setItem('ac_user',JSON.stringify(this.user));this.loadAll();},error:e=>this.error=this.apiError(e,'No se pudo iniciar sesión')});}
 logout(){localStorage.removeItem('ac_token');localStorage.removeItem('ac_user');this.token='';this.user=null;}
 go(id:string){this.section=id;this.message='';this.error='';this.loadSection();}
 title(){return this.menu.find(x=>x.id===this.section)?.label||'Inicio';}
 loadAll(){this.loadCore();this.loadSection();}
 loadCore(){this.http.get<any>(this.api+'/dashboard',{headers:this.headers()}).subscribe({next:r=>this.stats=r});this.loadCells();}
 loadSection(){
  if(this.section==='users')this.loadUsers();
  if(this.section==='cells')this.loadCells();
  if(this.section==='movements'){this.loadMovements();this.loadVehicles();this.loadMemberships();this.loadPayments();}
  if(this.section==='customers'){this.loadCustomers();this.loadVehicles();}
  if(this.section==='memberships'){this.loadCustomers();this.loadVehicles();}
  if(this.section==='payments'){this.loadVehicles();this.loadMemberships();this.loadPayments();}
  if(this.section==='audit')this.http.get<any[]>(this.api+'/audit',{headers:this.headers()}).subscribe({next:r=>this.audit=r,error:e=>this.error=e.error?.detail||'Error'});
 }
 loadUsers(){this.http.get<any[]>(this.api+'/users?q='+encodeURIComponent(this.search),{headers:this.headers()}).subscribe({next:r=>this.users=r,error:e=>this.error=e.error?.detail||'Error'});}
 loadCells(){this.http.get<any[]>(this.api+'/cells?estado='+encodeURIComponent(this.cellFilter),{headers:this.headers()}).subscribe({next:r=>this.cells=r,error:e=>this.error=e.error?.detail||'Error'});}
 loadMovements(){this.http.get<any[]>(this.api+'/movements',{headers:this.headers()}).subscribe({next:r=>this.movements=r});}
 loadCustomers(){this.http.get<any[]>(this.api+'/customers',{headers:this.headers()}).subscribe({next:r=>this.customers=r});}
 loadVehicles(){this.http.get<any[]>(this.api+'/vehicles',{headers:this.headers()}).subscribe({next:r=>this.vehicles=r});}
 loadMemberships(){this.http.get<any[]>(this.api+'/memberships',{headers:this.headers()}).subscribe({next:r=>this.memberships=r});}
 loadPayments(){this.http.get<any[]>(this.api+'/payments',{headers:this.headers()}).subscribe({next:r=>this.payments=r});}
 createUser(){this.request('POST','/users',this.newUser,()=>{this.newUser={nombre_completo:'',tipo_documento:'CC',documento:'',telefono:'',correo:'',username:'',password:'',rol:'Operario'};this.loadUsers();});}
 toggleUser(u:any){this.request('PUT','/users/'+u.id,{activo:!u.activo},()=>this.loadUsers());}
 createCell(){this.message='';this.error='';const codigo=String(this.newCell.codigo||'').trim();const nombre=String(this.newCell.nombre||'').trim();if(!codigo){this.error='Escribe el código de la celda, por ejemplo C-01.';return;}if(!nombre){this.error='Escribe el nombre o la zona donde está ubicada la celda.';return;}if(!['Carro','Moto'].includes(this.newCell.tipo)){this.error='Selecciona si la celda es para carro o moto.';return;}if(!['Disponible','Inhabilitada'].includes(this.newCell.estado)){this.error='Selecciona un estado inicial válido para la celda.';return;}const cell={...this.newCell,codigo,nombre};this.request('POST','/cells',cell,()=>{this.newCell={codigo:'',nombre:'',tipo:'Carro',estado:'Disponible'};this.loadCells();});}
 toggleCell(c:any){this.request('PUT','/cells/'+c.id,{estado:c.estado==='Disponible'?'Inhabilitada':'Disponible'},()=>this.loadCells());}
 availableCells(type:string){return this.cells.filter(c=>c.estado==='Disponible'&&c.tipo===type);}
 isAvailable(c:any){return c.estado==='Disponible';}
 onEntryVehicleChange(){const vehicle=this.entryEligibleVehicles.find(v=>v.placa===this.entryData.placa);this.entryData.tipo_vehiculo=vehicle?.tipo||'Carro';this.entryData.celda_id=0;}
 localToday(){const now=new Date();const year=now.getFullYear();const month=String(now.getMonth()+1).padStart(2,'0');const day=String(now.getDate()).padStart(2,'0');return `${year}-${month}-${day}`;}
 monthlyRate(type:string){return type==='Carro'?250000:type==='Moto'?100000:0;}
 onPaymentVehicleChange(){const vehicle=this.eligibleVehicles.find(v=>v.id===this.newPayment.vehiculo_id);if(!vehicle){this.newPayment.periodo_desde='';this.newPayment.periodo_hasta='';this.newPayment.valor=null;this.paymentPeriods=[];return;}this.newPayment.periodo_desde=this.todayDate;this.updatePaymentPreview();}
 onPaymentMonthsChange(){this.updatePaymentPreview();}
 updatePaymentPreview(){const vehicle=this.eligibleVehicles.find(v=>v.id===this.newPayment.vehiculo_id);if(!vehicle||!this.newPayment.periodo_desde){this.paymentPeriods=[];this.newPayment.valor=null;return;}const months=Math.max(1,Math.min(12,Number(this.newPayment.meses)||1));let start=this.newPayment.periodo_desde;this.paymentPeriods=[];for(let number=1;number<=months;number++){const end=this.addMonths(start,1,-1);this.paymentPeriods.push({numero:number,desde:start,hasta:end});start=this.addDays(end,1);}this.newPayment.periodo_hasta=this.paymentPeriods[this.paymentPeriods.length-1].hasta;this.newPayment.valor=this.monthlyRate(vehicle.tipo)*months;}
 paymentStatus(payment:any){const today=this.todayDate;const start=String(payment.periodo_desde).slice(0,10);const end=String(payment.periodo_hasta).slice(0,10);if(start>today)return 'Programada';if(end>=today)return 'Activa';return 'Vencida';}
 membershipStatus(membership:any){if(!membership.activa||!membership.cliente_activo||membership.vehiculo_activo===false)return 'Inactiva';const periods=this.paymentsForMembership(membership);if(periods.some(payment=>this.paymentStatus(payment)==='Activa'))return 'Activa';if(periods.some(payment=>this.paymentStatus(payment)==='Programada'))return 'Programada';if(membership.fecha_fin&&String(membership.fecha_fin).slice(0,10)<this.todayDate)return 'Vencida · pendiente de pago';return 'Pendiente de pago';}
 paidMonths(membership:any){return this.payments.filter(payment=>payment.vehiculo_id===membership.vehiculo_id).length;}
 paymentsForMembership(membership:any){return this.payments.filter(payment=>payment.vehiculo_id===membership.vehiculo_id).sort((a,b)=>String(a.periodo_desde).localeCompare(String(b.periodo_desde)));}
 generateReceipt(payment:any){this.receiptPayment=payment;this.printMode='receipt';setTimeout(()=>{window.print();this.printMode='';},100);}
 printPaymentReport(){if(!this.isAdmin){this.error='Solo el administrador puede generar el reporte de pagos.';return;}if(!this.reportPayments.length){this.error='No hay pagos para generar el reporte.';return;}this.error='';this.printMode='report';setTimeout(()=>{window.print();this.printMode='';},100);}
 addDays(value:string,days:number){const date=new Date(value+'T12:00:00');date.setDate(date.getDate()+days);return this.formatDate(date);}
 addMonths(value:string,months:number,days:number){const date=new Date(value+'T12:00:00');const targetMonth=date.getMonth()+months;const targetYear=date.getFullYear()+Math.floor(targetMonth/12);const month=((targetMonth%12)+12)%12;const lastDay=new Date(targetYear,month+1,0).getDate();date.setFullYear(targetYear,month,Math.min(date.getDate(),lastDay));date.setDate(date.getDate()+days);return this.formatDate(date);}
 formatDate(value:Date){return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;}
 entry(){this.message='';this.error='';const vehicle=this.entryEligibleVehicles.find(v=>v.placa===this.entryData.placa);if(!vehicle){this.error='No se puede registrar la entrada: el vehículo no tiene una mensualidad pagada y vigente.';return;}if(!this.entryData.celda_id){this.error='Selecciona una celda disponible para registrar la entrada.';return;}this.request('POST','/movements/entry',this.entryData,()=>{this.entryData={placa:'',tipo_vehiculo:'Carro',celda_id:0,observaciones:''};this.loadMovements();this.loadMemberships();this.loadPayments();});}
 exit(){this.request('POST','/movements/exit',{placa:this.exitPlate},()=>{this.exitPlate='';this.loadMovements();});}
 transfer(){this.request('POST','/movements/transfer',this.transferData,()=>{this.transferData={placa:'',celda_destino_id:0};this.loadMovements();});}
 saveCustomer(){this.message='';this.error='';const nombre=String(this.newCustomer.nombre||'').trim();const documento=String(this.newCustomer.documento||'').trim();const correo=String(this.newCustomer.correo||'').trim();if(!nombre){this.error='Ingresa el nombre completo del cliente.';return;}if(!documento){this.error='Ingresa el número de documento del cliente.';return;}if(correo&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)){this.error='Escribe un correo electrónico válido o deja el campo vacío.';return;}const editing=this.editingCustomerId!==null;this.request(editing?'PUT':'POST',editing?'/customers/'+this.editingCustomerId:'/customers',{...this.newCustomer,nombre,documento,correo},()=>{this.newCustomer={nombre:'',documento:'',telefono:'',correo:''};this.editingCustomerId=null;this.loadCustomers();this.loadVehicles();});}
 editCustomer(customer:any){this.editingCustomerId=customer.id;this.newCustomer={nombre:customer.nombre,documento:customer.documento,telefono:customer.telefono||'',correo:customer.correo||''};this.message='';this.error='';}
 cancelCustomerEdit(){this.editingCustomerId=null;this.newCustomer={nombre:'',documento:'',telefono:'',correo:''};}
 toggleCustomer(customer:any){this.request('PUT','/customers/'+customer.id,{activo:!customer.activo},()=>{this.loadCustomers();this.loadVehicles();this.loadMemberships();});}
 saveVehicle(){this.message='';this.error='';const placa=String(this.newVehicle.placa||'').trim();const existing=this.vehicles.find(v=>v.id===this.editingVehicleId);if(!placa){this.error='Ingresa la placa del vehículo.';return;}if(!['Carro','Moto'].includes(this.newVehicle.tipo)){this.error='Selecciona si el vehículo es un carro o una moto.';return;}const owner=this.customers.find(c=>c.id===this.newVehicle.cliente_id);if(!owner||(!owner.activo&&owner.id!==existing?.cliente_id)){this.error='Selecciona un cliente activo para el vehículo.';return;}const editing=this.editingVehicleId!==null;this.request(editing?'PUT':'POST',editing?'/vehicles/'+this.editingVehicleId:'/vehicles',{...this.newVehicle,placa},()=>{this.newVehicle={placa:'',tipo:'Carro',cliente_id:0};this.editingVehicleId=null;this.loadVehicles();this.loadMemberships();});}
 editVehicle(vehicle:any){this.editingVehicleId=vehicle.id;this.newVehicle={placa:vehicle.placa,tipo:vehicle.tipo,cliente_id:vehicle.cliente_id};this.message='';this.error='';}
 cancelVehicleEdit(){this.editingVehicleId=null;this.newVehicle={placa:'',tipo:'Carro',cliente_id:0};}
 toggleVehicle(vehicle:any){this.request('PUT','/vehicles/'+vehicle.id,{activo:!vehicle.activo},()=>{this.loadVehicles();this.loadMemberships();});}
 createPayment(){this.message='';this.error='';if(!this.newPayment.vehiculo_id){this.error='Selecciona la placa del vehículo que vas a pagar.';return;}const months=Number(this.newPayment.meses);if(!Number.isInteger(months)||months<1||months>12){this.error='Selecciona entre 1 y 12 meses para el pago.';return;}if(this.newPayment.periodo_desde!==this.todayDate||!this.newPayment.periodo_hasta){this.error='El periodo de pago no está completo. Selecciona de nuevo la placa.';return;}const vehicle=this.eligibleVehicles.find(v=>v.id===this.newPayment.vehiculo_id);if(!vehicle||this.newPayment.valor!==this.monthlyRate(vehicle.tipo)*months){this.error='El total no coincide con la tarifa mensual y la cantidad de meses.';return;}this.request('POST','/payments',this.newPayment,()=>{this.newPayment={vehiculo_id:0,periodo_desde:'',periodo_hasta:'',valor:null,meses:1,metodo:'Efectivo',referencia:''};this.paymentPeriods=[];this.loadPayments();this.loadMemberships();});}
 changePassword(){this.request('POST','/auth/change-password',this.passwordData,()=>this.passwordData={actual:'',nueva:''});}
}
