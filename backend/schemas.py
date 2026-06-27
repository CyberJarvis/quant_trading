from pydantic import BaseModel, Field
from typing import Optional


class UserSignUp(BaseModel):
    name: str = Field(..., example="Akash Sharma")
    email: str = Field(..., example="akash@domain.com")
    password: str = Field(..., min_length=6, example="securePassword123")


class UserLogin(BaseModel):
    email: str = Field(..., example="akash@domain.com")
    password: str = Field(..., example="securePassword123")


class VerifyOTP(BaseModel):
    email: str = Field(..., example="akash@domain.com")
    otp: str = Field(..., min_length=6, max_length=6, example="123456")


class UserOnboarding(BaseModel):
    email: str
    capital: float = Field(..., gt=0, example=500000.0)
    goal: str = Field(..., example="growth")
    risk: str = Field(..., example="MODERATE")
    horizon: str = Field(..., example="36")
    sectors: str = Field(..., example="Technology, Finance")


class UserProfilingUpdate(BaseModel):
    email: str
    past_experience: str
    investment_style: str
    loss_behavior: str
    financial_knowledge: float
    tax_slab: str
