#!/usr/bin/env python3
"""Read-only entry point; disable import writes before loading the local package."""
import sys
sys.dont_write_bytecode = True
from harness_check.cli import main

if __name__ == '__main__':
    raise SystemExit(main())
