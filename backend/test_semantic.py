from semantic_matcher import calculate_similarity


resume = """
B.Sc. Computer Science student with knowledge of Python,
C++, JavaScript and SQL. Interested in software development
and data analysis.
"""


job_description = """
We are looking for a candidate with Python programming,
SQL knowledge and basic software development skills.
The candidate should have a Computer Science background.
"""


score = calculate_similarity(resume, job_description)


print("\n--- SEMANTIC MATCHING ---")
print("Resume-JD Match Score:", score, "%")