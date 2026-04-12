"""Document chunking service (Section 8)."""

from __future__ import annotations

from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter


@dataclass
class Chunk:
    text: str
    start_char: int
    end_char: int
    chunk_index: int


def chunk_document(text: str, chunk_size: int = 512, overlap: int = 50) -> list[Chunk]:
    """
    Split text into semantically cohesive chunks.
    Sizes are evaluated strictly in tokens using cl100k_base via tiktoken.
    """
    if not text or not text.strip():
        return []

    # Initialize the splitter with tiktoken encoding for token boundaries
    # and sentence boundaries for semantic coherence.
    splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        encoding_name="cl100k_base",
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ".", "!", "?", " ", ""],
        add_start_index=True,
    )

    docs = splitter.create_documents([text])

    chunks = []
    current_idx = 0
    
    for doc in docs:
        stripped_text = doc.page_content.strip()
        if not stripped_text:
            continue
            
        start_char = doc.metadata.get("start_index", 0)
        # Using the length of the string to map local end_char accurately
        end_char = start_char + len(doc.page_content)
        
        chunks.append(
            Chunk(
                text=stripped_text,
                start_char=start_char,
                end_char=end_char,
                chunk_index=current_idx,
            )
        )
        current_idx += 1

    return chunks
