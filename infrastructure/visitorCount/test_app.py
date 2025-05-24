import json
import pytest
from unittest.mock import patch, MagicMock
import os

# ✅ Set the env var before import
os.environ['TABLE_NAME'] = 'mock-table'

from app import lambda_handler

@patch("app.boto3.resource")
def test_lambda_handler_returns_count(mock_boto3):
    mock_table = MagicMock()
    mock_table.update_item.return_value = {
        'Attributes': {'count': 42}
    }

    mock_boto3.return_value.Table.return_value = mock_table

    event = {}
    context = {}

    result = lambda_handler(event, context)

    assert result["statusCode"] == 200
    body = json.loads(result["body"])
    assert "count" in body
    assert body["count"] == 42