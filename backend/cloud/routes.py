from fastapi import APIRouter, HTTPException, Depends
from cloud.mongo import mongo_db, ping_mongo
from cloud.utils import now_utc, object_id_to_str, object_ids_to_str, to_object_id
from cloud.auth import (
    hash_access_code,
    verify_access_code,
    create_access_token,
    get_current_token_payload,
)
from cloud.schemas import (
    BidderLoginRequest,
    BidderCreateRequest,
    CandidateProfileCreateRequest,
    CandidateAnswerCreateRequest,
)

router = APIRouter(prefix="/cloud", tags=["cloud-release"])


@router.get("/health")
async def cloud_health():
    await ping_mongo()

    return {
        "status": "ok",
        "database": "mongodb",
    }


@router.post("/admin/bidders")
async def create_bidder(req: BidderCreateRequest):
    existing = await mongo_db.bidders.find_one({"email": req.email}) if req.email else None

    if existing:
        raise HTTPException(status_code=400, detail="Bidder email already exists")

    bidder_doc = {
        "name": req.name,
        "email": req.email,
        "access_code_hash": hash_access_code(req.access_code),
        "assigned_candidate_id": req.assigned_candidate_id,
        "role": req.role,
        "is_active": req.is_active,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }

    result = await mongo_db.bidders.insert_one(bidder_doc)
    bidder_doc["_id"] = result.inserted_id

    safe_bidder = object_id_to_str(bidder_doc)
    safe_bidder.pop("access_code_hash", None)

    return safe_bidder


@router.post("/auth/login")
async def bidder_login(req: BidderLoginRequest):
    bidders_cursor = mongo_db.bidders.find({"is_active": True})
    bidders = await bidders_cursor.to_list(length=500)

    matched_bidder = None

    for bidder in bidders:
        if verify_access_code(req.access_code, bidder.get("access_code_hash", "")):
            matched_bidder = bidder
            break

    if not matched_bidder:
        raise HTTPException(status_code=401, detail="Invalid access code")

    candidate = None

    assigned_candidate_id = matched_bidder.get("assigned_candidate_id")

    if assigned_candidate_id:
        candidate = await mongo_db.candidate_profiles.find_one({
            "_id": to_object_id(assigned_candidate_id)
        })

    token = create_access_token({
        "bidder_id": str(matched_bidder["_id"]),
        "role": matched_bidder.get("role", "bidder"),
        "name": matched_bidder.get("name"),
    })

    safe_bidder = object_id_to_str(matched_bidder)
    safe_bidder.pop("access_code_hash", None)

    return {
        "access_token": token,
        "bidder": safe_bidder,
        "candidate": object_id_to_str(candidate) if candidate else None,
    }


@router.get("/me")
async def get_me(payload: dict = Depends(get_current_token_payload)):
    bidder_id = payload.get("bidder_id")

    bidder = await mongo_db.bidders.find_one({"_id": to_object_id(bidder_id)})

    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    candidate = None
    assigned_candidate_id = bidder.get("assigned_candidate_id")

    if assigned_candidate_id:
        candidate = await mongo_db.candidate_profiles.find_one({
            "_id": to_object_id(assigned_candidate_id)
        })

    safe_bidder = object_id_to_str(bidder)
    safe_bidder.pop("access_code_hash", None)

    return {
        "bidder": safe_bidder,
        "candidate": object_id_to_str(candidate) if candidate else None,
    }


@router.post("/admin/candidates")
async def create_candidate_profile(req: CandidateProfileCreateRequest):
    candidate_doc = req.model_dump()
    candidate_doc["created_at"] = now_utc()
    candidate_doc["updated_at"] = now_utc()

    result = await mongo_db.candidate_profiles.insert_one(candidate_doc)
    candidate_doc["_id"] = result.inserted_id

    return object_id_to_str(candidate_doc)


@router.patch("/admin/bidders/{bidder_id}/assign-candidate/{candidate_id}")
async def assign_candidate_to_bidder(bidder_id: str, candidate_id: str):
    bidder = await mongo_db.bidders.find_one({"_id": to_object_id(bidder_id)})
    candidate = await mongo_db.candidate_profiles.find_one({"_id": to_object_id(candidate_id)})

    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    await mongo_db.bidders.update_one(
        {"_id": to_object_id(bidder_id)},
        {
            "$set": {
                "assigned_candidate_id": candidate_id,
                "updated_at": now_utc(),
            }
        }
    )

    await mongo_db.candidate_profiles.update_one(
        {"_id": to_object_id(candidate_id)},
        {
            "$set": {
                "bidder_id": bidder_id,
                "updated_at": now_utc(),
            }
        }
    )

    return {
        "message": "Candidate assigned to bidder",
        "bidder_id": bidder_id,
        "candidate_id": candidate_id,
    }


@router.post("/candidate-answers")
async def create_candidate_answer(
    req: CandidateAnswerCreateRequest,
    payload: dict = Depends(get_current_token_payload),
):
    candidate = await mongo_db.candidate_profiles.find_one({
        "_id": to_object_id(req.candidate_id)
    })

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    answer_doc = req.model_dump()
    answer_doc["created_at"] = now_utc()
    answer_doc["updated_at"] = now_utc()

    result = await mongo_db.candidate_answers.insert_one(answer_doc)
    answer_doc["_id"] = result.inserted_id

    return object_id_to_str(answer_doc)


@router.get("/candidate-answers/{candidate_id}")
async def list_candidate_answers(
    candidate_id: str,
    payload: dict = Depends(get_current_token_payload),
):
    answers = await mongo_db.candidate_answers.find(
        {"candidate_id": candidate_id}
    ).sort("created_at", -1).to_list(length=200)

    return object_ids_to_str(answers)