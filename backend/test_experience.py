from resume.parser import extract_text_from_pdf
from experience_matcher import check_experience


pdf_path = "resume/Shilpi_Resume (1).pdf"


# Extract resume text
resume_text = extract_text_from_pdf(pdf_path)


# Job Description
job_description = """
We are looking for a Junior Software Developer.

Requirements:
- Bachelor's degree in Computer Science or related field
- Knowledge of Python and C++
- Knowledge of JavaScript and SQL
- Basic understanding of software development
- Problem solving and communication skills
- Ability to work in a team
"""


# Check experience
result = check_experience(
    resume_text,
    job_description
)


print("\n--- EXPERIENCE MATCHING ---")

print("Status:", result["status"])

print("\nRequired Experience:")
for experience in result["required"]:
    print("•", experience)

print("\nMatched Experience:")
for experience in result["matched"]:
    print("✓", experience)