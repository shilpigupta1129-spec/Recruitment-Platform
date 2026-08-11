from resume.parser import extract_text_from_pdf
from semantic_matcher import calculate_similarity, extract_skill_matches


# Actual resume PDF
pdf_path = "resume/Shilpi_Resume (1).pdf"


# Extract text from PDF
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


# Calculate semantic similarity
score = calculate_similarity(
    resume_text,
    job_description
)


# Find matched and missing skills
matched_skills, missing_skills = extract_skill_matches(
    resume_text,
    job_description
)


print("\n--- SEMANTIC RESUME MATCHING ---")
print("Resume:", pdf_path)
print("Match Score:", score, "%")

print("\nMatched Skills:")
for skill in matched_skills:
    print("✓", skill)

print("\nMissing Skills:")
for skill in missing_skills:
    print("✗", skill)