import sys
from pathlib import Path


include = '    include /etc/nginx/snippets/chineseos-reading-tutor.conf;\n'
anchor = '    ssl_protocols TLSv1.2 TLSv1.3;\n'


def render(vhost):
    if vhost.count(anchor) != 1 or 'listen 443 ssl http2;' not in vhost:
        raise ValueError('The TLS vhost has changed. Review the include placement.')
    if include in vhost:
        if vhost.count(include) == 1 and anchor + include in vhost:
            return vhost
        raise ValueError('Found an existing tutor include in an unexpected position.')
    return vhost.replace(anchor, anchor + include)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 render-alibaba-vhost.py <existing-vhost>')
    sys.stdout.write(render(Path(sys.argv[1]).read_text()))
