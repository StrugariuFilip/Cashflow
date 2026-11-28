import base64

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.user import UserProfileUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_my_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.first_name = profile_data.first_name
    current_user.last_name = profile_data.last_name
    try:
        db.commit()
        db.refresh(current_user)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save your profile details.",
        )
    return current_user


@router.put("/me/avatar", response_model=UserResponse)
async def upload_profile_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed_types = {
        "image/jpeg": ("jpg", b"\xff\xd8\xff"),
        "image/png": ("png", b"\x89PNG\r\n\x1a\n"),
        "image/webp": ("webp", b"RIFF"),
    }
    signature = allowed_types.get(file.content_type or "")
    if signature is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a JPG, PNG, or WebP image.",
        )

    image = await file.read(2 * 1024 * 1024 + 1)
    if len(image) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="The profile photo must be 2 MB or smaller.",
        )

    extension, magic_bytes = signature
    is_valid_image = image.startswith(magic_bytes)
    if extension == "webp":
        is_valid_image = is_valid_image and image[8:12] == b"WEBP"
    if not is_valid_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected file is not a valid image of the declared type.",
        )

    current_user.avatar_data = (
        f"data:{file.content_type};base64,{base64.b64encode(image).decode('ascii')}"
    )
    try:
        db.commit()
        db.refresh(current_user)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the profile photo.",
        )
    finally:
        await file.close()

    return current_user


@router.delete("/me/avatar", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.avatar_data = None
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not remove the profile photo.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
