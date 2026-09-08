import unittest

from mcp_server.harsf_server import (
    _cosine_similarity,
    _is_local_ollama_url,
    _looks_sensitive,
)


class HarsfMcpSafetyTests(unittest.TestCase):
    def test_local_ollama_url_only(self):
        self.assertTrue(_is_local_ollama_url("http://127.0.0.1:11434"))
        self.assertTrue(_is_local_ollama_url("http://localhost:11434"))
        self.assertFalse(_is_local_ollama_url("https://example.com"))
        self.assertFalse(_is_local_ollama_url("file:///tmp/ollama"))

    def test_sensitive_text_detection(self):
        self.assertTrue(_looks_sensitive("OTP 123456"))
        self.assertTrue(_looks_sensitive("api key sk-exampleexampleexample"))
        self.assertFalse(_looks_sensitive("Fix the n8n intake workflow"))

    def test_cosine_similarity(self):
        self.assertAlmostEqual(_cosine_similarity([1.0, 0.0], [1.0, 0.0]), 1.0)
        self.assertAlmostEqual(_cosine_similarity([1.0, 0.0], [0.0, 1.0]), 0.0)
        self.assertEqual(_cosine_similarity([], []), 0.0)
        self.assertEqual(_cosine_similarity([1.0], [1.0, 2.0]), 0.0)


if __name__ == "__main__":
    unittest.main()
