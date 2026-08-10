from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


# Load the semantic embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")


def calculate_similarity(resume_text, job_description):
    """
    Compare resume text with job description
    using semantic embeddings and cosine similarity.
    """

    # Convert both texts into embeddings
    resume_embedding = model.encode([resume_text])
    job_embedding = model.encode([job_description])

    # Calculate cosine similarity
    similarity = cosine_similarity(
        resume_embedding,
        job_embedding
    )[0][0]

    # Convert to percentage
    score = similarity * 100

    return round(score, 2)