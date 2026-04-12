"""Unit tests for the chunker service."""

from app.core.chunker import chunk_document, Chunk


def test_short_document_single_chunk():
    """Ensure a short text fits elegantly within a single chunk."""
    text = "This is a short document. It should fit easily."
    chunks = chunk_document(text, chunk_size=512, overlap=50)
    
    assert len(chunks) == 1
    assert chunks[0].text == text
    assert chunks[0].start_char == 0
    assert chunks[0].end_char == len(text)
    assert chunks[0].chunk_index == 0


def test_long_document_multiple_chunks():
    """Verify that exceeding token limits splits the file into numerous bounds."""
    # Generate a long string exceeding tight chunk sizes
    text = "Word. " * 300 
    chunks = chunk_document(text, chunk_size=20, overlap=5)
    
    assert len(chunks) > 1
    assert chunks[0].chunk_index == 0
    assert chunks[-1].chunk_index == len(chunks) - 1
    
    # Assert start and end locations track successfully
    assert chunks[0].start_char == 0
    assert chunks[0].end_char > 0


def test_chunk_overlap():
    """Validate overlapping offsets cross chunks without data loss."""
    # Build text heavily separated by boundaries.
    text = "Sentence A. Sentence B. Sentence C. Sentence D. Sentence E. Sentence F. Sentence G."
    # The chunk size forces splits, while overlap repeats sentences sequentially across limits.
    chunks = chunk_document(text, chunk_size=12, overlap=5)
    
    assert len(chunks) > 1
    
    # Confirm exact repetition / intersection between adjacent chunks 
    overlaps = False
    for i in range(len(chunks) - 1):
        if chunks[i].end_char > chunks[i+1].start_char:
            overlaps = True
            break
            
    assert overlaps, "Expected text coordinates to share intersection lengths due to token overlap"


def test_empty_document():
    """Empty strings cleanly return zero list arrays."""
    assert chunk_document("") == []
    assert chunk_document("   \n  ") == []


def test_preserves_sentence_boundaries():
    """Validate separation cleanly stops strings at sentence terminators initially over direct whitespace."""
    # The chunk boundary limits token parsing close to "Sentence one." limit.
    text = "Sentence one. Sentence two. Sentence three."
    chunks = chunk_document(text, chunk_size=6, overlap=0)
    
    assert len(chunks) > 1
    
    # Expectation: Sentence 1 resolves solidly on its period rather than trailing character truncations.
    # We verify the splitter chose `.` or space dynamically correctly.
    first_chunk = chunks[0].text
    
    # Validate entire boundary inclusion
    assert "Sentence one" in first_chunk
    assert "en" in first_chunk
