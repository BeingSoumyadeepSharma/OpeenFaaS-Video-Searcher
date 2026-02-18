from setuptools import setup, find_packages

setup(
    name="aisprint-stub",
    version="0.1.0",
    description="No-op stub for aisprint, used to run original code unchanged in OpenFaaS",
    packages=find_packages(),
    install_requires=[],
)
