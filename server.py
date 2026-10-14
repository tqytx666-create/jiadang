#!/usr/bin/env python3
"""家当本地小服务：静态网页 + /api/analyze（AI 看图识别区域里有什么）。
密钥只在这里读取，不会发给网页。"""
import base64, http.server, json, os, re, sys, urllib.request, urllib.error

PORT = int(os.environ.get("PORT", "8793"))
ROOT = os.path.dirname(os.path.abspath(__file__))
CFG = os.path.expanduser("~/.codex/deepseek.config.toml")
BASE = os.environ.get("JD_AI_BASE", "https://api.deepseek.com/anthropic")
MODEL = os.environ.get("JD_AI_MODEL", "deepseek-flash")


def token():
    t = os.environ.get("JD_AI_TOKEN")
    if t:
        return t
    try:
        m = re.search(r'experimental_bearer_token\s*=\s*"([^"]+)"', open(CFG).read())
        return m.group(1) if m else None
    except OSError:
        return None


PROMPT = """你是家庭收纳助手。这张照片拍的是家里的一个收纳区域（抽屉/柜层/箱子），或者是一件单独的东西。
请看图，只输出一个 JSON 对象，不要任何别的文字，字段如下：
- "name": 给这个区域起的名字（例如"常备药箱""线材电池抽屉"）；如果是单件物品就写物品名
- "purpose": 一句话猜测这个区域的用途（例如"放全家常备药，感冒/外伤"）
- "items": 看得到的东西的关键词列表，中文，每个 2~6 个字，最多 20 个，细碎同类可合并（如"螺丝刀""各种电池"）
- "cats": 从下面类别里选 1~3 个最贴切的：{cats}
- "count": 大概多少件，例如"约15件"，看不清就留空字符串
{hint}"""


def analyze(body):
    tok = token()
    if not tok:
        return 500, "没找到 AI 密钥（~/.codex/deepseek.config.toml）"
    img = body.get("image", "")
    m = re.match(r"data:(image/[\w.+-]+);base64,(.+)", img, re.S)
    if not m:
        return 400, "图片格式不对"
    hint = body.get("hint") or ""
    prompt = PROMPT.format(
        cats="、".join(body.get("cats") or []),
        hint=("用户给这个区域起的名字是：" + hint) if hint else "",
    )
    payload = {
        "model": MODEL,
        "max_tokens": 4000,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": m.group(1), "data": m.group(2)}},
                {"type": "text", "text": prompt},
            ],
        }],
    }
    req = urllib.request.Request(
        BASE.rstrip("/") + "/v1/messages",
        data=json.dumps(payload).encode(),
        headers={"content-type": "application/json", "x-api-key": tok,
                 "authorization": "Bearer " + tok, "anthropic-version": "2023-06-01"},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            res = json.loads(r.read())
    except urllib.error.HTTPError as e:
        return 502, "AI 服务返回 %s：%s" % (e.code, e.read()[:200].decode("utf8", "ignore"))
    except Exception as e:  # noqa
        return 502, "连不上 AI 服务：%s" % e
    text = "".join(b.get("text", "") for b in res.get("content", []) if b.get("type") == "text")
    mm = re.search(r"\{.*\}", text, re.S)
    if not mm:
        return 502, "AI 没按格式回答：" + text[:120]
    try:
        out = json.loads(mm.group(0))
    except ValueError:
        return 502, "AI 回答解析失败：" + text[:120]
    return 200, json.dumps({
        "name": str(out.get("name", ""))[:30],
        "purpose": str(out.get("purpose", ""))[:80],
        "items": [str(x)[:12] for x in (out.get("items") or [])][:30],
        "cats": [c for c in (out.get("cats") or []) if c in (body.get("cats") or [])],
        "count": str(out.get("count", ""))[:20],
    }, ensure_ascii=False)


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        if self.path != "/api/analyze":
            self.send_error(404)
            return
        try:
            n = int(self.headers.get("content-length", 0))
            code, msg = analyze(json.loads(self.rfile.read(n)))
        except Exception as e:  # noqa
            code, msg = 500, "服务出错：%s" % e
        data = msg.encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8" if code == 200 else "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H)
    print("家当已启动： http://localhost:%d" % PORT, flush=True)
    srv.serve_forever()
