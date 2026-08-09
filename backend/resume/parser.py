
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
    lines = text.splitlines()

    ignored_sections = {
        "CAREER OBJECTIVE",
        "EDUCATION",
        "TECHNICAL SKILLS",
        "PROGRAMMING LANGUAGES",
        "STRENGTHS",
        "EXTRACURRICULAR",
        "CONTACT",
        "PHONE",
        "EMAIL",
        "LOCATION",
    }

    for line in lines:
        line = line.strip()

        if not line:
            continue

        if line.upper() in ignored_sections:
            continue

        if line.isupper() and 2 <= len(line.split()) <= 4:
            return line

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

        if line.upper() == "TECHNICAL SKILLS":
            inside_skills_section = True
            continue

        if inside_skills_section and line.upper() in [
            "EDUCATION",
            "STRENGTHS",
            "EXTRACURRICULAR",
            "EXPERIENCE",
            "PROJECTS"
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

    experience_keywords = [
        "Experience",
        "Internship",
        "Intern",
        "Worked",
        "Digital Creative",
        "PR activities",
        "Event Management",
        "Cultural Committee"
    ]

    for line in lines:
        line = line.strip()

        if not line:
            continue

        for keyword in experience_keywords:
            if keyword.lower() in line.lower():
                if line not in experience:
                    experience.append(line)
                break

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

