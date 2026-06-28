import os
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, HTTPException

from db import users_collection, MONGO_AVAILABLE
from schemas import UserSignUp, UserLogin, UserOnboarding, VerifyOTP, UserProfilingUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])

DEMO_USER = {
    "name": "Demo User",
    "email": "demo@pravah.ai",
    "verified": True,
    "onboarding_completed": True,
    "capital": 500000,
    "goal": "growth",
    "risk": "MODERATE",
    "horizon": "36",
    "sectors": "Technology, Finance",
    "past_experience": "INTERMEDIATE",
    "investment_style": "GROWTH",
    "loss_behavior": "HOLD",
    "financial_knowledge": 3.0,
    "tax_slab": "5L_15L",
}


def send_otp_email(email: str, otp: str) -> bool:
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "").replace(" ", "").strip()
    if not smtp_user or not smtp_pass:
        print(f"\n[DEMO] OTP for {email}: {otp}\n")
        return False
    try:
        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = email
        msg["Subject"] = f"P.R.A.V.A.H — Your OTP: {otp}"
        msg.attach(MIMEText(f"Your PRAVAH verification OTP is: {otp}", "plain"))
        server = smtplib.SMTP(os.getenv("SMTP_HOST", "smtp.gmail.com"), int(os.getenv("SMTP_PORT", "587")))
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Email error: {e}\n[DEMO] OTP for {email}: {otp}\n")
        return False


@router.post("/signup")
def signup(req: UserSignUp):
    if not MONGO_AVAILABLE or users_collection is None:
        return {"message": "Demo mode: account created.", "email": req.email, "otp_fallback": "123456"}

    existing = users_collection.find_one({"email": req.email})
    if existing and existing.get("verified", False):
        raise HTTPException(status_code=400, detail="Email already registered.")

    otp = f"{random.randint(100000, 999999)}"
    if existing:
        users_collection.update_one({"email": req.email}, {"$set": {"name": req.name, "password": req.password, "otp_code": otp}})
    else:
        users_collection.insert_one({"name": req.name, "email": req.email, "password": req.password, "otp_code": otp, "verified": False, "onboarding_completed": False})

    send_otp_email(req.email, otp)
    return {"message": "OTP sent.", "email": req.email}


@router.post("/verify-otp")
def verify_otp(req: VerifyOTP):
    if not MONGO_AVAILABLE or users_collection is None:
        if req.otp == "123456":
            return {"message": "OTP verified.", "name": "Demo User", "email": req.email}
        raise HTTPException(status_code=400, detail="Invalid OTP. Demo OTP is: 123456")

    user = users_collection.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.get("otp_code") != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    users_collection.update_one({"email": req.email}, {"$set": {"verified": True}, "$unset": {"otp_code": ""}})
    return {"message": "OTP verified.", "name": user["name"], "email": user["email"]}


@router.post("/login")
def login(req: UserLogin):
    if not MONGO_AVAILABLE or users_collection is None:
        return {"message": "Login successful.", "name": "Demo User", "email": req.email, "onboarding_completed": True}

    user = users_collection.find_one({"email": req.email})
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=400, detail="Invalid email or password.")
    if not user.get("verified", False):
        otp = f"{random.randint(100000, 999999)}"
        users_collection.update_one({"email": req.email}, {"$set": {"otp_code": otp}})
        send_otp_email(req.email, otp)
        raise HTTPException(status_code=403, detail="Email not verified. OTP sent to your email.")

    return {"message": "Login successful.", "name": user["name"], "email": user["email"], "onboarding_completed": user.get("onboarding_completed", False)}


@router.post("/onboarding")
def save_onboarding(req: UserOnboarding):
    if not MONGO_AVAILABLE or users_collection is None or req.email == "demo@pravah.ai":
        return {"message": "Onboarding saved (demo)."}

    user = users_collection.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    users_collection.update_one({"email": req.email}, {"$set": {
        "capital": req.capital, "goal": req.goal, "risk": req.risk,
        "horizon": req.horizon, "sectors": req.sectors, "onboarding_completed": True
    }})
    return {"message": "Onboarding completed."}


@router.get("/user/profile")
def get_user_profile(email: str):
    if not MONGO_AVAILABLE or users_collection is None:
        return {**DEMO_USER, "email": email}

    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "name": user["name"], "email": user["email"],
        "capital": user.get("capital", 500000),
        "goal": user.get("goal", "growth"),
        "risk": user.get("risk", "MODERATE"),
        "horizon": user.get("horizon", "36"),
        "sectors": user.get("sectors", "Technology"),
        "onboarding_completed": user.get("onboarding_completed", False),
        "past_experience": user.get("past_experience", "BEGINNER"),
        "investment_style": user.get("investment_style", "GROWTH"),
        "loss_behavior": user.get("loss_behavior", "HOLD"),
        "financial_knowledge": user.get("financial_knowledge", 3.0),
        "tax_slab": user.get("tax_slab", "5L_15L"),
    }


@router.post("/user/profiling")
def save_user_profiling(req: UserProfilingUpdate):
    if not MONGO_AVAILABLE or users_collection is None or req.email == "demo@pravah.ai":
        return {"message": "Profiling updated (demo)."}

    user = users_collection.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    users_collection.update_one({"email": req.email}, {"$set": {
        "past_experience": req.past_experience,
        "investment_style": req.investment_style,
        "loss_behavior": req.loss_behavior,
        "financial_knowledge": req.financial_knowledge,
        "tax_slab": req.tax_slab,
    }})
    return {"message": "Behavioral profiling updated."}
