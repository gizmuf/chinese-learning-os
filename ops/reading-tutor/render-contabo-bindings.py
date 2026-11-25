import os
import re
import sys
from pathlib import Path


binding = 'DEEPSEEK_READING_TUTOR_ADDITIONAL_ORIGIN'
value = 'https://cos.l00p.network'


def render(current):
    matches = re.findall(rf'^\s*(?:export\s+)?{binding}\s*=\s*(.*?)\s*$', current, re.MULTILINE)
    if not matches:
        newline = '' if current.endswith('\n') else '\n'
        return current + newline + f'{binding}={value}\n'
    if len(matches) == 1 and matches[0] in (value, f'"{value}"', f"'{value}'"):
        return current
    raise ValueError('Tutor origin is already configured differently. Review the protected bindings file.')


if __name__ == '__main__':
    if len(sys.argv) != 3 or Path(sys.argv[1]).resolve() == Path(sys.argv[2]).resolve():
        raise SystemExit('Usage: python3 render-contabo-bindings.py <protected-input> <new-protected-output>')
    updated = render(Path(sys.argv[1]).read_text())
    fd = os.open(sys.argv[2], os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as output:
        output.write(updated)
