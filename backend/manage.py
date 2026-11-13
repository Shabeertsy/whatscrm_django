#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    # When running runserver without an explicit host/port, default to 0.0.0.0:8000
    # This allows Docker containers (Evolution API) to deliver real-time webhooks
    # to host.docker.internal (172.17.0.1:8000) instead of getting ECONNREFUSED.
    if len(sys.argv) > 1 and sys.argv[1] == "runserver":
        has_custom_addr = any(
            (":" in arg) or (arg.isdigit() and len(arg) >= 4)
            for arg in sys.argv[2:]
            if not arg.startswith("-")
        )
        if not has_custom_addr:
            sys.argv.append("0.0.0.0:8000")

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
