window.__ModuleLoader__.load({
  id: 'dsh-qr-scanner',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'qr-scanner';
    const ENDPOINT = '/plugin/qr-scanner/decode';
    const MAX_EDGE = 2400;
    const MAX_BYTES = 24 * 1024 * 1024;

    const DICTS = {
      zh: {
        nav: '二维码识别',
        title: '二维码识别',
        intro: '把二维码图片拖进来，也可以点击选择文件，或让虚线框获得焦点后直接粘贴截图。识别结果会显示图片里的链接。',
        dropMain: '拖入图片、点击选择，或聚焦后按 Ctrl+V 粘贴',
        dropSub: '支持 PNG、JPEG、WebP 等常见格式',
        working: '正在识别…',
        copy: '复制内容',
        copied: '已复制',
        copyFailed: '复制失败，请手动选择文本',
        open: '打开链接',
        again: '换一张',
        notFound: '没有在这张图片里找到二维码。试试更清晰的截图，或让整张二维码出现在画面里。',
        failed: '识别失败',
        urlTag: '链接',
        textTag: '文本',
        previewAlt: '选择的图片',
        multipleFound: '这张图片里有多张二维码，先显示第一个识别结果。',
        tooLarge: '图片太大了（超过 24 MB），请先压缩，或只截取二维码部分。',
        unsupported: '请选择图片文件（PNG、JPEG、WebP 等）。',
        privacy: '图片只在本机识别，不会上传到网络。',
      },
      en: {
        nav: 'QR code reader',
        title: 'QR code reader',
        intro: 'Drop a QR code image here, choose a file, or focus the frame and paste a screenshot. The decoded link shows up below.',
        dropMain: 'Drop an image, click to choose, or focus and press Ctrl+V',
        dropSub: 'PNG, JPEG, WebP and other common formats',
        working: 'Reading…',
        copy: 'Copy',
        copied: 'Copied',
        copyFailed: 'Copy failed, select the text manually',
        open: 'Open link',
        again: 'Another image',
        notFound: 'No QR code found in this image. Try a sharper screenshot with the whole code in frame.',
        failed: 'Could not read the image',
        urlTag: 'Link',
        textTag: 'Text',
        previewAlt: 'Selected image',
        multipleFound: 'This image holds several QR codes; the first result is shown.',
        tooLarge: 'The image is too large (over 24 MB). Compress it or crop the QR code first.',
        unsupported: 'Choose an image file (PNG, JPEG, WebP, …).',
        privacy: 'Decoded locally on this machine; nothing is uploaded.',
      },
    };

    const CSS = `
.qrsc { display:flex; flex-direction:column; gap:14px; max-width:660px; padding:2px 0 8px; color:var(--dsw-alias-label-primary); font-size:13px; line-height:1.55; }
.qrsc-head { display:flex; flex-direction:column; gap:4px; }
.qrsc-title { margin:0; font-size:15px; font-weight:600; }
.qrsc-intro { margin:0; color:var(--dsw-alias-label-secondary); }
.qrsc-drop { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; padding:26px 20px; border:1px dashed var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-1); cursor:pointer; text-align:center; transition:border-color .15s ease, background .15s ease; }
.qrsc-drop:hover { border-color:var(--dsw-alias-brand-primary); background:var(--dsw-alias-bg-layer-2); }
.qrsc-drop:focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:2px; }
.qrsc-drop-active { border-color:var(--dsw-alias-brand-primary); background:var(--dsw-alias-bg-layer-2); }
.qrsc-drop-icon { display:flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:50%; color:var(--dsw-alias-brand-primary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); }
.qrsc-drop-main { font-weight:500; }
.qrsc-drop-sub { color:var(--dsw-alias-label-secondary); font-size:12px; }
.qrsc-result { display:flex; gap:14px; padding:14px; border:1px solid var(--dsw-alias-border-l1); border-radius:12px; background:var(--dsw-alias-bg-layer-1); }
.qrsc-thumb { flex:none; width:84px; height:84px; object-fit:contain; border-radius:8px; background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); }
.qrsc-body { display:flex; flex-direction:column; gap:8px; min-width:0; flex:1; }
.qrsc-tag { align-self:flex-start; padding:1px 7px; border-radius:999px; font-size:11px; line-height:1.7; color:var(--dsw-alias-brand-primary); border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-base); }
.qrsc-value { font-size:13px; word-break:break-all; user-select:text; }
.qrsc-link { color:var(--dsw-alias-brand-primary); text-decoration:none; }
.qrsc-link:hover { text-decoration:underline; }
.qrsc-meta { font-size:12px; color:var(--dsw-alias-label-secondary); }
.qrsc-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:2px; }
.qrsc-btn { appearance:none; font:inherit; font-size:12px; padding:5px 11px; border-radius:8px; cursor:pointer; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); transition:background .15s ease, border-color .15s ease; }
.qrsc-btn:hover { background:var(--dsw-alias-bg-layer-2); border-color:var(--dsw-alias-border-l2); }
.qrsc-note { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); }
.qrsc-note-text { flex:1; min-width:0; font-size:12.5px; color:var(--dsw-alias-label-secondary); word-break:break-word; }
.qrsc-note-warn .qrsc-note-text { color:var(--dsw-alias-state-warn-primary); }
.qrsc-note-error .qrsc-note-text { color:var(--dsw-alias-state-error-primary); }
.qrsc-foot { font-size:12px; color:var(--dsw-alias-label-secondary); }
`;

    let translate = (key) => key;
    let watchLocale = () => () => {};

    function useLocale() {
      const [, bump] = React.useState(0);
      React.useEffect(() => watchLocale(() => bump((value) => value + 1)), []);
      return translate;
    }

    function imageFromClipboard(event) {
      const items = event.clipboardData && event.clipboardData.items;
      if (!items) return undefined;
      for (const item of items) {
        if (item.kind === 'file' && typeof item.type === 'string' && item.type.startsWith('image/')) {
          return item.getAsFile() || undefined;
        }
      }
      return undefined;
    }

    function Scanner() {
      const t = useLocale();
      const [status, setStatus] = React.useState('idle');
      const [payload, setPayload] = React.useState(null);
      const [message, setMessage] = React.useState('');
      const [preview, setPreview] = React.useState('');
      const [dragging, setDragging] = React.useState(false);
      const [copied, setCopied] = React.useState('');

      const inputRef = React.useRef(null);
      const rootRef = React.useRef(null);
      const objectUrlRef = React.useRef('');
      const runIdRef = React.useRef(0);

      React.useEffect(() => () => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      }, []);

      const reset = React.useCallback(() => {
        runIdRef.current += 1;
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = '';
        }
        setPreview('');
        setPayload(null);
        setMessage('');
        setStatus('idle');
        setCopied('');
      }, []);

      const run = React.useCallback(async (file) => {
        if (!file) return;
        if (file.size > MAX_BYTES) {
          setStatus('error');
          setMessage(t('tooLarge'));
          return;
        }
        const runId = (runIdRef.current += 1);
        const fresh = () => runIdRef.current === runId;

        setStatus('working');
        setMessage('');
        setPayload(null);
        setCopied('');

        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const objectUrl = URL.createObjectURL(file);
        objectUrlRef.current = objectUrl;
        setPreview(objectUrl);

        try {
          const bitmap = await createImageBitmap(file);
          const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
          const width = Math.max(1, Math.round(bitmap.width * scale));
          const height = Math.max(1, Math.round(bitmap.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('canvas 2d context is unavailable');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, width, height);
          context.drawImage(bitmap, 0, 0, width, height);
          if (typeof bitmap.close === 'function') bitmap.close();
          const pixels = context.getImageData(0, 0, width, height).data;

          const response = await fetch(`${ENDPOINT}?w=${width}&h=${height}`, {
            method: 'POST',
            headers: { 'content-type': 'application/octet-stream' },
            body: pixels,
          });
          const result = await response.json().catch(() => null);
          if (!fresh()) return;
          if (result && result.ok === true && typeof result.text === 'string') {
            setPayload(result);
            setStatus('done');
            return;
          }
          if (result && result.error === 'not_found') {
            setStatus('missing');
            return;
          }
          setStatus('error');
          setMessage((result && (result.detail || result.error)) || `HTTP ${response.status}`);
        } catch (error) {
          if (!fresh()) return;
          setStatus('error');
          setMessage(error && error.message ? error.message : String(error));
        }
      }, [t]);

      const pick = React.useCallback((file) => {
        if (!file) return;
        if (typeof file.type === 'string' && file.type.length > 0 && !file.type.startsWith('image/')) {
          setStatus('error');
          setMessage(t('unsupported'));
          return;
        }
        void run(file);
      }, [run, t]);

      React.useEffect(() => {
        const onPaste = (event) => {
          const active = document.activeElement;
          const editing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
          if (editing) return;
          const root = rootRef.current;
          if (!root || root.offsetParent === null) return;
          const file = imageFromClipboard(event);
          if (file) pick(file);
        };
        document.addEventListener('paste', onPaste);
        return () => document.removeEventListener('paste', onPaste);
      }, [pick]);

      const copy = React.useCallback(async () => {
        const text = payload && payload.text;
        if (!text) return;
        let ok = false;
        try {
          await navigator.clipboard.writeText(text);
          ok = true;
        } catch {
          const area = document.createElement('textarea');
          area.value = text;
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          try {
            ok = document.execCommand('copy');
          } catch {
            ok = false;
          }
          area.remove();
        }
        setCopied(ok ? 'ok' : 'fail');
        window.setTimeout(() => setCopied(''), 1800);
      }, [payload]);

      const isUrl = Boolean(payload && payload.kind === 'url');
      const working = status === 'working';

      return h('div', { className: 'qrsc', ref: rootRef },
        h('style', null, CSS),
        h('div', { className: 'qrsc-head' },
          h('h2', { className: 'qrsc-title' }, t('title')),
          h('p', { className: 'qrsc-intro' }, t('intro')),
        ),
        h('div', {
          className: `qrsc-drop${dragging ? ' qrsc-drop-active' : ''}`,
          role: 'button',
          tabIndex: 0,
          'aria-busy': working ? 'true' : 'false',
          onClick: () => { if (inputRef.current) inputRef.current.click(); },
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (inputRef.current) inputRef.current.click();
            }
          },
          onDragOver: (event) => { event.preventDefault(); setDragging(true); },
          onDragEnter: (event) => { event.preventDefault(); setDragging(true); },
          onDragLeave: () => setDragging(false),
          onDrop: (event) => {
            event.preventDefault();
            setDragging(false);
            const files = event.dataTransfer && event.dataTransfer.files;
            if (files && files.length > 0) pick(files[0]);
          },
        },
          h('span', { className: 'qrsc-drop-icon', 'aria-hidden': true },
            h('svg', {
              viewBox: '0 0 24 24', width: 26, height: 26, fill: 'none',
              stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
            },
              h('path', { d: 'M4 8.5V5.8A1.8 1.8 0 0 1 5.8 4h2.7' }),
              h('path', { d: 'M15.5 4h2.7A1.8 1.8 0 0 1 20 5.8v2.7' }),
              h('path', { d: 'M20 15.5v2.7a1.8 1.8 0 0 1-1.8 1.8h-2.7' }),
              h('path', { d: 'M8.5 20H5.8A1.8 1.8 0 0 1 4 18.2v-2.7' }),
              h('rect', { x: 9, y: 9, width: 6, height: 6, rx: 1.2 }),
            )),
          h('span', { className: 'qrsc-drop-main' }, working ? t('working') : t('dropMain')),
          h('span', { className: 'qrsc-drop-sub' }, t('dropSub')),
        ),
        h('input', {
          ref: inputRef,
          type: 'file',
          accept: 'image/*',
          style: { display: 'none' },
          onChange: (event) => {
            const files = event.target.files;
            const file = files && files[0];
            event.target.value = '';
            if (file) pick(file);
          },
        }),
        status === 'done' && payload ? h('div', { className: 'qrsc-result' },
          preview ? h('img', { className: 'qrsc-thumb', src: preview, alt: t('previewAlt') }) : null,
          h('div', { className: 'qrsc-body' },
            h('span', { className: 'qrsc-tag' }, isUrl ? t('urlTag') : t('textTag')),
            isUrl
              ? h('a', {
                className: 'qrsc-value qrsc-link',
                href: payload.text,
                target: '_blank',
                rel: 'noreferrer noopener',
                title: payload.text,
              }, payload.text)
              : h('div', { className: 'qrsc-value' }, payload.text),
            payload.count > 1 ? h('div', { className: 'qrsc-meta' }, t('multipleFound')) : null,
            h('div', { className: 'qrsc-actions' },
              h('button', { type: 'button', className: 'qrsc-btn', onClick: copy },
                copied === 'ok' ? t('copied') : t('copy')),
              isUrl
                ? h('button', {
                  type: 'button',
                  className: 'qrsc-btn',
                  onClick: () => window.open(payload.text, '_blank', 'noopener,noreferrer'),
                }, t('open'))
                : null,
              h('button', { type: 'button', className: 'qrsc-btn', onClick: reset }, t('again')),
            ),
            copied === 'fail' ? h('div', { className: 'qrsc-meta' }, t('copyFailed')) : null,
          ),
        ) : null,
        status === 'missing' ? h('div', { className: 'qrsc-note qrsc-note-warn' },
          h('span', { className: 'qrsc-note-text' }, t('notFound')),
          h('button', { type: 'button', className: 'qrsc-btn', onClick: reset }, t('again')),
        ) : null,
        status === 'error' ? h('div', { className: 'qrsc-note qrsc-note-error' },
          h('span', { className: 'qrsc-note-text' }, `${t('failed')}: ${message}`),
          h('button', { type: 'button', className: 'qrsc-btn', onClick: reset }, t('again')),
        ) : null,
        h('p', { className: 'qrsc-foot', style: { margin: 0 } }, t('privacy')),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, 'zh', DICTS.zh), 'qr-scanner: zh dictionary');
        ctx.effect(() => ctx.locale.register(NS, 'en', DICTS.en), 'qr-scanner: en dictionary');
        translate = ctx.locale.bind(NS);
        watchLocale = (listener) => ctx.locale.subscribe(listener);
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'qr-scanner',
          order: 60,
          label: () => translate('nav'),
        }, Scanner));
      },
    };
  },
});
