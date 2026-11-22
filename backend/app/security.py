import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from . import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
SECRET = os.getenv("JWT_SECRET", "CAMBIA_ESTA_CLAVE_EN_ENV")
ALGORITHM = "HS256"

def hash_password(password): return pwd_context.hash(password)
def verify_password(password, hashed): return pwd_context.verify(password, hashed)

def create_token(user):
    payload = {"sub": str(user.id), "rol": user.rol,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=int(os.getenv("JWT_EXPIRES_MINUTES", "480")))}
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)

def current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        data = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        user = db.query(models.User).filter(models.User.id == int(data["sub"]), models.User.activo == True).first()
    except (JWTError, ValueError, KeyError):
        user = None
    if not user:
        raise HTTPException(401, "Sesión inválida o usuario inactivo")
    return user

def admin_only(user=Depends(current_user)):
    if user.rol != "Administrador":
        raise HTTPException(403, "Esta operación requiere rol Administrador")
    return user
