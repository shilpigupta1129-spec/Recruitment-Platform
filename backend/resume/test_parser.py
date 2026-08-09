from parser import (
    parse_resume,
    extract_text_from_pdf
)

pdf_path = "Test_Resume.pdf"

resume_data = parse_resume(pdf_path)

print("\n--- PARSED RESUME ---")

print("Name:", resume_data["name"])
print("Email:", resume_data["email"])
print("Phone:", resume_data["phone"])
print("Skills:", resume_data["skills"])
print("Education:", resume_data["education"])
print("Experience:", resume_data["experience"])

print("\n--- RAW TEXT ---")
print(extract_text_from_pdf(pdf_path))