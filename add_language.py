"""
A script to add a new language to the tree-sitter-gritql project.
see https://github.com/getgrit/tree-sitter-gritql/commit/ea51437
"""

# Future imports (must occur at the beginning of the file):
from __future__ import annotations  # https://www.python.org/dev/peps/pep-0585/

# Standard library imports:
import os
import re
import json
from argparse import Namespace, ArgumentParser
from subprocess import check_output, CalledProcessError

repo_path = os.path.dirname(os.path.realpath(__file__))
src_path = os.path.join(repo_path, "src")

# https://regex101.com/r/YnCDji/1
GRAMMAR_LANGUAGE_CHOICE = re.compile(
    r"""
    \/\/ These are target languages
    languageName: \(\_\$\) =>
      choice\(
        ('grit',)
        (\s*'\w+',\n?)+
        (?P<last_language>\s*'\w+',)
      \),""",
)


def main(args: Namespace):
    """Automate the process of adding a new language to the tree-sitter-gritql grammar/parser."""

    grammar_js_path = os.path.join(repo_path, "grammar.js")
    with open(grammar_js_path, "r") as f:
        grammar_js = f.read()
    match = GRAMMAR_LANGUAGE_CHOICE.search(grammar_js)
    assert match, "Could not find the languageName choice in grammar.js"
    print("Found languageName choice in grammar.js")
    print(match.group(0))

    # Extract the last language and append the new language
    last_language = match.group("last_language")
    new_language = f"\n        '{args.language}',"
    language_name_block = match.group(0)
    new_language_name_block = language_name_block.replace(
        last_language, last_language + new_language
    )
    updated_grammar_js = grammar_js.replace(
        language_name_block, new_language_name_block
    )

    # Write the updated grammar.js file
    with open(grammar_js_path, "w") as f:
        f.write(updated_grammar_js)

    # check if tree-sitter is installed:
    try:
        output = (
            check_output(["tree-sitter", "--version"], cwd=repo_path).decode().strip()
        )
        print("using", output)
    except CalledProcessError:
        print("tree-sitter is not installed. Please install it first.")
        print("using `npm install -g tree-sitter-cli`")
        return

    output = check_output(["tree-sitter", "generate"], cwd=repo_path).decode().strip()
    print(output)

    grammar_path = os.path.join(src_path, "grammar.json")
    with open(grammar_path, "r") as f:
        grammar = json.load(f)
    # assert the language was added if not add it
    for member in grammar["rules"]["languageName"]["members"]:
        if member["value"] == args.language:
            print(f"{args.language} already exists in grammar.json")
            break
    else:
        print(f"Adding {args.language} to the grammar.json")
        grammar["rules"]["languageName"]["members"].append(
            {"type": "STRING", "value": args.language}
        )
        with open(grammar_path, "w") as f:
            json.dump(grammar, f, indent=2)
            f.write("\n")  # add trailing newline

    node_types_path = os.path.join(src_path, "node-types.json")
    with open(node_types_path, "r") as f:
        node_types = json.load(f)
    # assert the language was added if not add it
    for node_type in node_types:
        if node_type["type"] == args.language:
            print(f"{args.language} already exists in node-types.json")
            break
    else:
        print(f"Adding {args.language} to the node-types.json")
        node_types.append({"type": args.language, "named": False})
        with open(node_types_path, "w") as f:
            json.dump(node_types, f, indent=2)
            f.write("\n")  # add trailing newline

    output = check_output(["git", "status"], cwd=repo_path).decode().strip()
    print(output)


if __name__ == "__main__":
    parser = ArgumentParser(
        description="Add a new language to the tree-sitter-gritql project."
    )
    parser.add_argument(
        "--language",
        "--lang",
        help="The name of the language to add. e.g. 'kotlin'",
        required=True,
    )
    args = parser.parse_args()
    main(args)
