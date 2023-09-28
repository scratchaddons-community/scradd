#!/bin/bash

cd extension && git fetch --tags && git checkout $(git rev-list --tags --timestamp --no-walk | sort -nr | head -n1 | cut -f 2 -d ' ')
