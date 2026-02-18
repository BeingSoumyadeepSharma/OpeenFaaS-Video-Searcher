"""
No-op stub for aisprint.annotations.

The @annotation decorator simply returns the original function unchanged.
"""


def annotation(config):
    """No-op decorator that passes through the original function."""
    def decorator(func):
        return func
    return decorator
