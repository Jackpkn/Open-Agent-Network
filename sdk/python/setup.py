from setuptools import setup, find_packages  # type: ignore

setup(
    name="open-agent-network",
    version="0.1.0",
    description="Python SDK for Agent Commerce Protocol (ACP)",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Open Agent Network Team",
    packages=find_packages(),
    install_requires=[
        "httpx>=0.25.0",
        "web3>=6.10.0",
        "eth-account>=0.9.0",
    ],
    python_requires=">=3.9",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    entry_points={
        "console_scripts": [
            "open-agent-network=open_agent_network.cli:main",
        ],
    },
)
