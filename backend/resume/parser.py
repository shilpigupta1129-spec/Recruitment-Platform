
import pymupdf
import re


def extract_text_from_pdf(pdf_path):
    document = pymupdf.open(pdf_path)

    text = ""

    for page in document:
        text += page.get_text()

    document.close()

    return clean_text(text)


def clean_text(text):
    lines = text.splitlines()

    cleaned_lines = []

    for line in lines:
        line = line.strip()

        if line:
            cleaned_lines.append(line)

    return "\n".join(cleaned_lines)


def extract_email(text):
    pattern = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"

    match = re.search(pattern, text)

    if match:
        return match.group()

    return None


def extract_phone(text):
    pattern = r"\b\d{10}\b"

    match = re.search(pattern, text)

    if match:
        return match.group()

    return None



def extract_name(text):
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    # First, handle resumes with an explicit "Name:" label.
    for line in lines:
        if line.lower().startswith("name:"):
            name = line.split(":", 1)[1].strip()
            if name:
                return name

    # Fallback for this resume template, where the name is split
    # across two uppercase lines, such as AYESHA / QURESHI.
    for i in range(len(lines) - 1):
        first = lines[i]
        second = lines[i + 1]

        if (
            re.fullmatch(r"[A-Z][A-Z'-]*", first)
            and re.fullmatch(r"[A-Z][A-Z'-]*", second)
            and len(first) > 1
            and len(second) > 1
        ):
            name = f"{first.title()} {second.title()}"
            if name.lower() not in {"computer skills", "contact me"}:
                return name

    return None



def extract_skills(text):
    skills = []

    lines = text.splitlines()

    skill_keywords = [
        "Python",
        "C++",
        "Java",
        "JavaScript",
        "SQL",
        "HTML",
        "CSS",
        "React",
        "Node.js",
        "FastAPI",
        "Django",
        "Machine Learning",
        "Data Analysis",
        "Git",
        "GitHub"
    ]

    inside_skills_section = False

    for line in lines:
        line = line.strip()

        if line.lower() in ["skills", "technical skills"]:
            inside_skills_section = True
            continue

        if inside_skills_section and line.lower() in [
            "education",
            "experience",
            "projects",
            "strengths",
            "extracurricular"
        ]:
            break

        if inside_skills_section:
            for skill in skill_keywords:
                if re.search(
                    r"(?<![A-Za-z0-9+#])" + re.escape(skill) + r"(?![A-Za-z0-9+#])",
                    line,
                    re.IGNORECASE
                ):
                    if skill not in skills:
                        skills.append(skill)

    return skills




def extract_education(text):
    education = []

    lines = text.splitlines()

    education_keywords = [
        "B.Sc",
        "BSc",
        "Bachelor",
        "HSC",
        "Higher Secondary",
        "SSC",
        "Secondary School",
        "Graduation",
        "Expected Graduation"
    ]

    ignored_phrases = [
        "student seeking",
        "strong foundation",
        "career in",
        "technical knowledge",
        "professional skills"
    ]

    for line in lines:
        line = line.strip()

        if not line:
            continue

        # Remove bullet points
        line = re.sub(r"^[•●▪◦\-]+\s*", "", line)

        # Clean extra spaces
        line = re.sub(r"\s+", " ", line)

        lower_line = line.lower()

        # Ignore profile/summary sentences
        if any(phrase in lower_line for phrase in ignored_phrases):
            continue

        for keyword in education_keywords:

            if keyword.lower() in lower_line:

                if len(line) <= 150:
                    if line not in education:
                        education.append(line)

                break

    return education


def extract_experience(text):
    experience = []

    lines = text.splitlines()
    inside_experience_section = False

    for line in lines:
        line = line.strip()

        if not line:
            continue

        if line.lower() == "experience":
            inside_experience_section = True
            continue

        if inside_experience_section and line.lower() in [
            "projects",
            "education",
            "skills",
            "technical skills",
            "strengths",
            "extracurricular"
        ]:
            break

        if inside_experience_section:
            if line not in experience:
                experience.append(line)

    return experience


def parse_resume(pdf_path):
    text = extract_text_from_pdf(pdf_path)

    resume_data = {
        "name": extract_name(text),
        "email": extract_email(text),
        "phone": extract_phone(text),
        "skills": extract_skills(text),
        "education": extract_education(text),
        "experience": extract_experience(text)
    }

    return resume_data

