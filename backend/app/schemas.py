from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import date
from typing import Optional

class LoginIn(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    nombre_completo: str
    tipo_documento: str = "CC"
    documento: str
    telefono: str = ""
    correo: EmailStr
    username: str
    password: str = Field(min_length=8)
    rol: str = "Operario"

class UserUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[EmailStr] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None

class PasswordChange(BaseModel):
    actual: str
    nueva: str = Field(min_length=8)

class CellCreate(BaseModel):
    codigo: str
    nombre: str
    tipo: str
    estado: str = "Disponible"

    @field_validator("codigo", "nombre")
    @classmethod
    def required_text(cls, value: str) -> str:
        value=value.strip()
        if not value:
            raise ValueError("Este campo es obligatorio")
        return value

class CellUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    estado: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def nonblank_name(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            value=value.strip()
            if not value:
                raise ValueError("El nombre de la celda no puede quedar vacío")
        return value

class CustomerCreate(BaseModel):
    nombre: str
    documento: str
    telefono: str = ""
    correo: str = ""

    @field_validator("nombre", "documento")
    @classmethod
    def required_customer_text(cls, value: str) -> str:
        value=value.strip()
        if not value:
            raise ValueError("El nombre y el documento del cliente son obligatorios")
        return value

class CustomerUpdate(BaseModel):
    nombre: Optional[str] = None
    documento: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    activo: Optional[bool] = None

    @field_validator("nombre", "documento")
    @classmethod
    def nonblank_customer_text(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("El nombre y el documento del cliente no pueden quedar vacíos")
        return value

class VehicleCreate(BaseModel):
    placa: str
    tipo: str
    cliente_id: int = Field(gt=0)

    @field_validator("placa")
    @classmethod
    def required_plate(cls, value: str) -> str:
        value=value.strip()
        if not value:
            raise ValueError("La placa del vehículo es obligatoria")
        return value

    @field_validator("tipo")
    @classmethod
    def supported_vehicle_type(cls, value: str) -> str:
        if value not in ("Carro", "Moto"):
            raise ValueError("El parqueadero solo recibe carros y motos")
        return value

class VehicleUpdate(BaseModel):
    placa: Optional[str] = None
    tipo: Optional[str] = None
    cliente_id: Optional[int] = Field(default=None, gt=0)
    activo: Optional[bool] = None

    @field_validator("placa")
    @classmethod
    def nonblank_plate(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("La placa del vehículo es obligatoria")
        return value

    @field_validator("tipo")
    @classmethod
    def supported_updated_vehicle_type(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in ("Carro", "Moto"):
            raise ValueError("El parqueadero solo recibe carros y motos")
        return value

class MembershipCreate(BaseModel):
    vehiculo_id: int
    fecha_inicio: date
    fecha_fin: date
    valor: float = Field(gt=0)
    celda_fija_id: Optional[int] = None

class PaymentCreate(BaseModel):
    vehiculo_id: int = Field(gt=0)
    periodo_desde: date
    periodo_hasta: date
    valor: float = Field(gt=0)
    meses: int = Field(default=1, ge=1, le=12)
    metodo: str
    referencia: str = ""

class EntryCreate(BaseModel):
    placa: str
    tipo_vehiculo: str
    celda_id: int
    observaciones: str = ""

class ExitCreate(BaseModel):
    placa: str

class TransferCreate(BaseModel):
    placa: str
    celda_destino_id: int
