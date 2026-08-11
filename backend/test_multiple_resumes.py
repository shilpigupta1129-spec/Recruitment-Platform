from resume.parser import extract_text_from_pdf
from semantic_matcher import calculate_similarity


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


resumes = [
    "resume/Shilpi_Resume (1).pdf",
    "resume/Test_Resume.pdf"
]


print("\n================================")
print("     MULTIPLE RESUME TEST")
print("================================")


for pdf_path in resumes:

    resume_text = extract_text_from_pdf(pdf_path)

    score = calculate_similarity(
        resume_text,
        job_description
    )

    print("\nResume:", pdf_path)
    print("Semantic Match:", score, "%")