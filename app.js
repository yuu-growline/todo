(() => {
  'use strict';

  const STORAGE_KEY = 'yuu-todo-app-v1';
  const PRIORITY_ORDER = { high: 0, mid: 1, low: 2 };
  const PRIORITY_LABEL = { high: '🔥 高', mid: '🌿 中', low: '🍃 低' };

  /** @type {{id:string,title:string,done:boolean,priority:'high'|'mid'|'low',due:string,tag:string,createdAt:number}[]} */
  let todos = [];
  let currentFilter = 'all';
  let currentSort = 'created-desc';
  let searchQuery = '';

  // ===== Storage =====
  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      todos = Array.isArray(parsed) ? parsed : [];
      const before = todos.length;
      const seen = new Set();
      todos = todos.filter((t) => {
        if (!t || !t.id || seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      if (todos.length !== before) save();
    } catch (e) {
      console.error('読み込みエラー:', e);
      todos = [];
    }
  };
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      alert('保存に失敗しました: ' + e.message);
    }
  };

  // ===== Helpers =====
  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dueClass = (due) => {
    if (!due) return '';
    const today = todayISO();
    if (due < today) return 'overdue';
    if (due === today) return 'today';
    return '';
  };

  const formatDue = (due) => {
    if (!due) return '';
    const today = todayISO();
    if (due === today) return '📅 今日';
    if (due < today) return `⚠️ ${due}（期限超過）`;
    return `📅 ${due}`;
  };

  // ===== Filter & Sort =====
  const visibleTodos = () => {
    let list = todos.slice();
    if (currentFilter === 'active') list = list.filter((t) => !t.done);
    if (currentFilter === 'done')   list = list.filter((t) => t.done);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.tag && t.tag.toLowerCase().includes(q))
      );
    }
    switch (currentSort) {
      case 'created-asc':
        list.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'priority':
        list.sort(
          (a, b) =>
            PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
            b.createdAt - a.createdAt
        );
        break;
      case 'due':
        list.sort((a, b) => {
          if (!a.due && !b.due) return b.createdAt - a.createdAt;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return a.due.localeCompare(b.due);
        });
        break;
      case 'created-desc':
      default:
        list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  };

  // ===== Render =====
  const $list = document.getElementById('todo-list');
  const $empty = document.getElementById('empty-state');
  const $countActive = document.getElementById('count-active');
  const $countDone = document.getElementById('count-done');

  const render = () => {
    const list = visibleTodos();
    $list.innerHTML = list.map(renderItem).join('');
    $empty.classList.toggle('hidden', list.length > 0);
    $countActive.textContent = todos.filter((t) => !t.done).length;
    $countDone.textContent = todos.filter((t) => t.done).length;
  };

  const renderItem = (t) => {
    const due = t.due
      ? `<span class="todo-due ${dueClass(t.due)}">${escapeHtml(formatDue(t.due))}</span>`
      : '';
    const tag = t.tag ? `<span class="todo-tag">#${escapeHtml(t.tag)}</span>` : '';
    const priorityLabel = `<span>${PRIORITY_LABEL[t.priority] || ''}</span>`;
    return `
      <li class="todo-item priority-${t.priority} ${t.done ? 'done' : ''}" data-id="${t.id}">
        <input type="checkbox" class="todo-checkbox" ${t.done ? 'checked' : ''} aria-label="完了切替" />
        <div class="todo-content">
          <div class="todo-title" data-action="edit" title="ダブルクリックで編集">${escapeHtml(t.title)}</div>
          <div class="todo-meta">
            ${priorityLabel}
            ${due}
            ${tag}
          </div>
        </div>
        <div class="todo-actions">
          <button class="icon-btn delete" data-action="delete" title="削除" aria-label="削除">🗑️</button>
        </div>
      </li>
    `;
  };

  // ===== Actions =====
  const addTodo = (title, priority, due, tag) => {
    const t = {
      id: uid(),
      title: title.trim(),
      done: false,
      priority: priority || 'mid',
      due: due || '',
      tag: (tag || '').trim(),
      createdAt: Date.now(),
    };
    if (!t.title) return;
    todos.push(t);
    save();
    render();
  };

  const toggleTodo = (id) => {
    const t = todos.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    save();
    render();
  };

  const deleteTodo = (id) => {
    todos = todos.filter((x) => x.id !== id);
    save();
    render();
  };

  const editTitle = (id, newTitle) => {
    const t = todos.find((x) => x.id === id);
    if (!t) return;
    const trimmed = newTitle.trim();
    if (!trimmed) {
      deleteTodo(id);
      return;
    }
    t.title = trimmed;
    save();
    render();
  };

  // ===== Events =====
  document.getElementById('add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('input-title').value;
    const priority = document.getElementById('input-priority').value;
    const due = document.getElementById('input-due').value;
    const tag = document.getElementById('input-tag').value;
    addTodo(title, priority, due, tag);
    e.target.reset();
    document.getElementById('input-priority').value = 'mid';
    document.getElementById('input-title').focus();
  });

  $list.addEventListener('click', (e) => {
    const li = e.target.closest('.todo-item');
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.classList.contains('todo-checkbox')) {
      toggleTodo(id);
      return;
    }
    if (e.target.dataset.action === 'delete') {
      const t = todos.find((x) => x.id === id);
      if (t && confirm(`「${t.title}」を削除しますか？`)) deleteTodo(id);
    }
  });

  $list.addEventListener('dblclick', (e) => {
    const titleEl = e.target.closest('[data-action="edit"]');
    if (!titleEl) return;
    const li = titleEl.closest('.todo-item');
    const id = li.dataset.id;

    titleEl.contentEditable = 'true';
    titleEl.focus();
    document.getSelection().selectAllChildren(titleEl);

    let settled = false;
    const finish = (commit) => {
      if (settled) return;
      settled = true;
      titleEl.contentEditable = 'false';
      titleEl.removeEventListener('blur', onBlur);
      titleEl.removeEventListener('keydown', onKey);
      if (commit) editTitle(id, titleEl.textContent.replace(/\s+/g, ' '));
      else render();
    };
    const onBlur = () => finish(true);
    const onKey = (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
      if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
    };
    titleEl.addEventListener('blur', onBlur);
    titleEl.addEventListener('keydown', onKey);
  });

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  document.getElementById('search').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
  });

  document.getElementById('sort').addEventListener('change', (e) => {
    currentSort = e.target.value;
    render();
  });

  document.getElementById('btn-clear-done').addEventListener('click', () => {
    const doneCount = todos.filter((t) => t.done).length;
    if (doneCount === 0) {
      alert('完了タスクはありません');
      return;
    }
    if (confirm(`完了済み ${doneCount} 件を削除しますか？`)) {
      todos = todos.filter((t) => !t.done);
      save();
      render();
    }
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(todos, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todo-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });

  const sanitizeImported = (arr) =>
    arr
      .filter((x) => x && typeof x === 'object' && typeof x.title === 'string' && x.title.trim())
      .map((x) => ({
        id: typeof x.id === 'string' && x.id ? x.id : uid(),
        title: String(x.title).slice(0, 500),
        done: x.done === true,
        priority: ['high', 'mid', 'low'].includes(x.priority) ? x.priority : 'mid',
        due: typeof x.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.due) ? x.due : '',
        tag: typeof x.tag === 'string' ? x.tag.slice(0, 50) : '',
        createdAt: typeof x.createdAt === 'number' ? x.createdAt : Date.now(),
      }));

  const dedupeById = (arr) => {
    const map = new Map();
    arr.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  };

  document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error('配列形式ではありません');
        const cleaned = dedupeById(sanitizeImported(data));
        if (cleaned.length === 0) throw new Error('有効なタスクが含まれていません');

        const append = confirm(
          `${cleaned.length} 件を「追加」しますか？\n（キャンセルで現在のデータを上書きします）`
        );

        if (append) {
          const existingIds = new Set(todos.map((t) => t.id));
          const toAdd = cleaned.filter((t) => !existingIds.has(t.id));
          const skipped = cleaned.length - toAdd.length;
          todos = todos.concat(toAdd);
          save();
          render();
          alert(
            `追加: ${toAdd.length} 件 ✨` +
              (skipped > 0 ? `\n（重複ID ${skipped} 件はスキップ）` : '')
          );
        } else {
          todos = cleaned;
          save();
          render();
          alert(`上書きしました ✨（${cleaned.length} 件）`);
        }
      } catch (err) {
        alert('読み込み失敗: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  });

  // ===== Init =====
  load();
  render();
})();
