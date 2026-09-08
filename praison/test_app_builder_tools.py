from __future__ import annotations

import shutil
import unittest

try:
    from .app_builder_tools import DRAFT_ROOT, list_app_draft_files, read_app_draft_file, write_app_draft_file
except ImportError:
    from app_builder_tools import DRAFT_ROOT, list_app_draft_files, read_app_draft_file, write_app_draft_file


class AppBuilderToolsTest(unittest.TestCase):
    app_name = "CI Draft Tool Test"
    app_slug = "ci-draft-tool-test"

    def setUp(self) -> None:
        shutil.rmtree(DRAFT_ROOT / self.app_slug, ignore_errors=True)

    def tearDown(self) -> None:
        shutil.rmtree(DRAFT_ROOT / self.app_slug, ignore_errors=True)

    def test_write_list_and_read_draft_file(self) -> None:
        result = write_app_draft_file(self.app_name, "src/main.tsx", "export const ready = true;\n")
        self.assertTrue(result["written"])
        self.assertEqual(result["path"], "src/main.tsx")
        self.assertEqual(list_app_draft_files(self.app_name), ["src/main.tsx"])
        self.assertIn("ready", read_app_draft_file(self.app_name, "src/main.tsx"))

    def test_blocks_path_escape_and_secret_files(self) -> None:
        with self.assertRaises(ValueError):
            write_app_draft_file(self.app_name, "../outside.ts", "export {}")
        with self.assertRaises(ValueError):
            write_app_draft_file(self.app_name, ".env", "TOKEN=placeholder")

    def test_blocks_real_looking_secret_values(self) -> None:
        fake_secret = "sk-" + "a" * 24
        with self.assertRaises(ValueError):
            write_app_draft_file(self.app_name, "src/config.ts", f'export const token = "{fake_secret}";')

    def test_allows_environment_variable_placeholders(self) -> None:
        result = write_app_draft_file(
            self.app_name,
            "src/config.ts",
            'export const apiKey = process.env.API_KEY ?? "";\n',
        )
        self.assertTrue(result["written"])


if __name__ == "__main__":
    unittest.main()
