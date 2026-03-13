import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models, database
import os

# Whitelist of 45 emails
WHITELIST = [
    f"user{i}@example.com" for i in range(1, 46)
]

# Initialize Firebase Admin SDK
# You need to provide the path to your serviceAccountKey.json file
service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT", "serviceAccountKey.json")
if os.path.exists(service_account_path):
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
else:
    print(f"WARNING: Firebase service account key not found at {service_account_path}. Authentication will fail.")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Verify the ID token sent by the client
        decoded_token = auth.verify_id_token(token)
        email = decoded_token.get("email")
        
        if email is None or email not in WHITELIST:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not whitelisted"
            )
            
    except Exception as e:
        print(f"Auth error: {e}")
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        user = models.User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return user
