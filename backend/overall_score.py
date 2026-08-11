def calculate_overall_score(
    semantic_score,
    matched_skills,
    required_skills,
    qualification_status,
    experience_status
):
    """
    Calculate the overall candidate score.

    Weightage:
    Semantic Match   = 40%
    Skills Match     = 30%
    Qualification    = 20%
    Experience       = 10%
    """

    # -----------------------------
    # 1. Semantic score
    # -----------------------------
    semantic_component = semantic_score * 0.40

    # -----------------------------
    # 2. Skill score
    # -----------------------------
    if required_skills:
        skill_score = (
            len(matched_skills) / len(required_skills)
        ) * 100
    else:
        skill_score = 100

    skill_component = skill_score * 0.30

    # -----------------------------
    # 3. Qualification score
    # -----------------------------
    if qualification_status == "Matched":
        qualification_score = 100

    elif qualification_status == "Partially Matched":
        qualification_score = 50

    else:
        qualification_score = 0

    qualification_component = qualification_score * 0.20

    # -----------------------------
    # 4. Experience score
    # -----------------------------
    if experience_status == "Matched":
        experience_score = 100

    elif experience_status == "Partially Matched":
        experience_score = 50

    elif experience_status == "No experience requirement found":
        experience_score = 100

    else:
        experience_score = 0

    experience_component = experience_score * 0.10

    # -----------------------------
    # Final score
    # -----------------------------
    overall_score = (
        semantic_component
        + skill_component
        + qualification_component
        + experience_component
    )

    return round(overall_score, 2)