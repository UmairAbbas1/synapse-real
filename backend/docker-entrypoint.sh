#!/bin/sh
set -e

mkdir -p /app/.cache/huggingface/hub /app/.cache/sentence_transformers
chown -R synapse:synapse /app/.cache

exec runuser -u synapse -- "$@"
