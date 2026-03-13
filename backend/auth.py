import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models, database
import os

# Initialize Firebase Admin SDK
service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT", "serviceAccountKey.json")
if os.path.exists(service_account_path):
    if not firebase_admin._apps:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
else:
    print(f"WARNING: Firebase service account key not found at {service_account_path}.")
    if not firebase_admin._apps:
        # We MUST initialize the app, even if it fails later during token verification
        # This prevents "The default Firebase app does not exist" error
        try:
            firebase_admin.initialize_app()
        except Exception as e:
            print(f"Could not initialize default Firebase app: {e}")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Verify the ID token sent by the client
        decoded_token = firebase_auth.verify_id_token(token)
        email = decoded_token.get("email")
        
        if email is None:
            raise credentials_exception
            
        # Check dynamic whitelist in DB
        whitelisted = db.query(models.WhitelistedEmail).filter(models.WhitelistedEmail.email == email).first()
        
        # Hardcode initial admin or check if user exists and is_admin
        user = db.query(models.User).filter(models.User.email == email).first()
        
        # If not whitelisted and not an existing admin, block entry
        if not whitelisted and (user is None or not user.is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not whitelisted"
            )
            
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        print(f"Auth error: {e}")
        raise credentials_exception
    
    if user is None:
        user = models.User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return user

def admin_required(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user
