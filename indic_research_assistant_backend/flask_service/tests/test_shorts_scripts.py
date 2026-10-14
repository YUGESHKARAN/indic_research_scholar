import json
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from flask import Flask

from sarvam_integration import shorts_scripts


class ShortsScriptPreparationTests(unittest.TestCase):
    def setUp(self):
        app = Flask(__name__)
        app.register_blueprint(shorts_scripts.shorts_scripts_bp)
        self.client = app.test_client()
        self.internal_key_patch = patch.object(
            shorts_scripts, "INTERNAL_API_KEY", "test-key"
        )
        self.internal_key_patch.start()
        self.addCleanup(self.internal_key_patch.stop)

    def post_prepare(self, payload, key="test-key"):
        return self.client.post(
            "/api/shorts/scripts/prepare",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"x-internal-key": key},
        )

    def test_requires_internal_key(self):
        response = self.post_prepare(
            {"sourceText": "A source document"},
            key="wrong-key",
        )
        self.assertEqual(response.status_code, 401)

    def test_generates_narration_scenes_with_sarvam_and_requested_runtime(self):
        first_scene_narration = " ".join(f"word{index}" for index in range(110))
        second_scene_narration = " ".join(f"word{index}" for index in range(115))
        model_result = {
            "title": "Microservices, explained",
            "targetDurationSeconds": 90,
            "scenes": [
                {
                    "type": "title",
                    "visualTitle": "Microservices architecture",
                    "visualDescription": "Independent services as building blocks.",
                    "narration": first_scene_narration,
                },
                {
                    "type": "diagram",
                    "visualTitle": "Requests through a gateway",
                    "visualDescription": "A gateway routes requests to services.",
                    "narration": second_scene_narration,
                    "mermaidCode": "flowchart LR\n Client --> Gateway\n Gateway --> Service",
                },
            ],
        }
        completion = Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(
                content=json.dumps(model_result)
            ))]
        ))
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({
                "sourceText": "Duration: 90 seconds. Do not narrate the duration metadata.",
                "userDescription": "Make this a practical Tamil explainer.",
                "targetDurationSeconds": 90,
                "requestedSceneCount": 2,
                "requestedSceneDurations": [45, 45],
            })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), model_result)
        completion.assert_called_once()
        self.assertEqual(completion.call_args.kwargs["model"], "sarvam-105b")
        self.assertIsNone(completion.call_args.kwargs["reasoning_effort"])
        self.assertEqual(completion.call_args.kwargs["max_tokens"], 2500)
        self.assertIn(
            "Use exactly 90 seconds",
            completion.call_args.kwargs["messages"][1]["content"],
        )
        self.assertIn(
            "Preserve exactly 2 scenes",
            completion.call_args.kwargs["messages"][1]["content"],
        )
        self.assertIn(
            "Use these exact scene durations in order: 45, 45 seconds",
            completion.call_args.kwargs["messages"][1]["content"],
        )
        self.assertIn(
            "at least 225 spoken words",
            completion.call_args.kwargs["messages"][1]["content"],
        )
        system_prompt = completion.call_args.kwargs["messages"][0]["content"]
        self.assertIn("Never narrate those labels or read metadata", system_prompt)
        self.assertIn("return only json", system_prompt.lower())

    def test_rejects_invalid_duration_without_calling_sarvam(self):
        completion = Mock()
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({
                "sourceText": "A source document",
                "targetDurationSeconds": 301,
            })
        self.assertEqual(response.status_code, 400)
        completion.assert_not_called()

    def test_rejects_scene_timings_that_do_not_sum_to_target_runtime(self):
        completion = Mock()
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({
                "sourceText": "A source document",
                "targetDurationSeconds": 90,
                "requestedSceneCount": 2,
                "requestedSceneDurations": [20, 20],
            })

        self.assertEqual(response.status_code, 400)
        completion.assert_not_called()

    def test_preserves_scene_count_when_runtime_is_inferred(self):
        model_result = {
            "title": "A concise explainer",
            "targetDurationSeconds": 60,
            "scenes": [
                {
                    "type": "concept",
                    "visualTitle": "Core idea",
                    "visualDescription": "Illustrate the main idea.",
                    "narration": "Here is the main idea.",
                }
            ],
        }
        completion = Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(
                content=json.dumps(model_result)
            ))]
        ))
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({
                "sourceText": "Scene headings are present, but no total runtime is specified.",
                "requestedSceneCount": 1,
            })

        self.assertEqual(response.status_code, 200)
        self.assertIn(
            "Preserve exactly 1 scene.",
            completion.call_args.kwargs["messages"][1]["content"],
        )

    def test_reuses_source_mermaid_when_model_omits_diagram_code(self):
        model_result = {
            "title": "Microservices",
            "targetDurationSeconds": 90,
            "scenes": [
                {
                    "type": "diagram",
                    "visualTitle": "Separate services",
                    "visualDescription": "A gateway routes requests to independently deployed services.",
                    "narration": " ".join(f"word{index}" for index in range(225)),
                }
            ],
        }
        completion = Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(
                content=json.dumps(model_result)
            ))]
        ))
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        source_text = """Architecture:
```mermaid
flowchart LR
  Client --> Gateway
  Gateway --> Auth
  Gateway --> Payments
```
"""
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({
                "sourceText": source_text,
                "targetDurationSeconds": 90,
                "requestedSceneCount": 1,
            })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json()["scenes"][0]["mermaidCode"],
            "flowchart LR\n  Client --> Gateway\n  Gateway --> Auth\n  Gateway --> Payments",
        )

    def test_downgrades_diagram_without_code_or_source_diagram(self):
        model_result = {
            "title": "A concise explainer",
            "targetDurationSeconds": 60,
            "scenes": [
                {
                    "type": "diagram",
                    "visualTitle": "Core idea",
                    "visualDescription": "Illustrate the main idea.",
                    "narration": " ".join(f"word{index}" for index in range(150)),
                }
            ],
        }
        completion = Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(
                content=json.dumps(model_result)
            ))]
        ))
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({
                "sourceText": "A source document without a diagram.",
                "targetDurationSeconds": 60,
                "requestedSceneCount": 1,
            })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["scenes"][0]["type"], "concept")

    def test_retries_when_sarvam_narration_is_too_short_for_requested_runtime(self):
        short_result = {
            "title": "A concise explainer",
            "targetDurationSeconds": 60,
            "scenes": [{
                "type": "concept",
                "visualTitle": "Core idea",
                "visualDescription": "Illustrate the main idea.",
                "narration": "This response is too short.",
            }],
        }
        complete_result = {
            **short_result,
            "scenes": [{
                **short_result["scenes"][0],
                "narration": " ".join(f"word{index}" for index in range(150)),
            }],
        }
        completion = Mock(side_effect=[
            SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(
                content=json.dumps(short_result)
            ))]),
            SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(
                content=json.dumps(complete_result)
            ))]),
        ])
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({
                "sourceText": "A source document.",
                "targetDurationSeconds": 60,
            })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(completion.call_count, 2)
        self.assertIn(
            "Include at least 150 spoken words total",
            completion.call_args_list[1].kwargs["messages"][1]["content"],
        )

    def test_rejects_narration_still_short_after_one_retry(self):
        short_result = {
            "title": "A concise explainer",
            "targetDurationSeconds": 60,
            "scenes": [{
                "type": "concept",
                "visualTitle": "Core idea",
                "visualDescription": "Illustrate the main idea.",
                "narration": "Still not enough words.",
            }],
        }
        completion = Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(
                content=json.dumps(short_result)
            ))]
        ))
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({
                "sourceText": "A source document.",
                "targetDurationSeconds": 60,
            })

        self.assertEqual(response.status_code, 502)
        self.assertIn("enough narration", response.get_json()["error"])
        self.assertEqual(completion.call_count, 2)

    def test_retries_malformed_response_and_accepts_json_with_surrounding_text(self):
        valid_result = {
            "title": "A concise explainer",
            "targetDurationSeconds": 60,
            "scenes": [{
                "type": "concept",
                "visualTitle": "Core idea",
                "visualDescription": "Illustrate the main idea.",
                "narration": "Here is a complete explanation of the core idea.",
            }],
        }
        completion = Mock(side_effect=[
            SimpleNamespace(
                id="response-1",
                choices=[SimpleNamespace(
                    finish_reason="stop",
                    message=SimpleNamespace(content='{"title": broken'),
                )],
            ),
            SimpleNamespace(
                id="response-2",
                choices=[SimpleNamespace(
                    finish_reason="stop",
                    message=SimpleNamespace(content=(
                        "Here is the result:\n```json\n"
                        f"{json.dumps(valid_result)}\n```\n"
                    )),
                )],
            ),
        ])
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({
                "sourceText": "A source document.",
            })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["title"], valid_result["title"])
        self.assertEqual(completion.call_count, 2)

    def test_retries_empty_completion_and_recovers(self):
        valid_result = {
            "title": "A concise explainer",
            "targetDurationSeconds": 60,
            "scenes": [{
                "type": "concept",
                "visualTitle": "Core idea",
                "visualDescription": "Illustrate the main idea.",
                "narration": "Here is a complete explanation of the core idea.",
            }],
        }
        completion = Mock(side_effect=[
            SimpleNamespace(choices=[SimpleNamespace(
                finish_reason="stop",
                message=SimpleNamespace(content=None),
            )]),
            SimpleNamespace(choices=[SimpleNamespace(
                finish_reason="stop",
                message=SimpleNamespace(content=json.dumps(valid_result)),
            )]),
        ])
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({
                "sourceText": "A source document.",
            })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["title"], valid_result["title"])
        self.assertEqual(completion.call_count, 2)

    def test_accepts_text_blocks_from_sarvam_completion_content(self):
        valid_result = {
            "title": "A concise explainer",
            "targetDurationSeconds": 60,
            "scenes": [{
                "type": "concept",
                "visualTitle": "Core idea",
                "visualDescription": "Illustrate the main idea.",
                "narration": "Here is a complete explanation of the core idea.",
            }],
        }
        completion = Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=[
                {"type": "text", "text": json.dumps(valid_result)},
            ]))]
        ))
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({
                "sourceText": "A source document.",
            })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["title"], valid_result["title"])

    def test_reports_invalid_model_output(self):
        completion = Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="not JSON"))]
        ))
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({"sourceText": "A source document"})
        self.assertEqual(response.status_code, 502)
        self.assertIn("invalid explainer response", response.get_json()["error"])

    def test_reports_empty_model_output_without_raising_attribute_error(self):
        completion = Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=None))]
        ))
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({"sourceText": "A source document"})

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.get_json()["error"],
            "Sarvam returned an invalid explainer response after retrying. Please try again.",
        )
        self.assertEqual(completion.call_count, 2)

    def test_reports_missing_completion_choices(self):
        completion = Mock(return_value=SimpleNamespace(choices=[]))
        mock_client = SimpleNamespace(
            chat=SimpleNamespace(completions=completion)
        )
        with patch.object(shorts_scripts, "sarvam_client", mock_client):
            response = self.post_prepare({"sourceText": "A source document"})

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.get_json()["error"],
            "Sarvam returned an invalid explainer response after retrying. Please try again.",
        )
        self.assertEqual(completion.call_count, 2)


if __name__ == "__main__":
    unittest.main()
