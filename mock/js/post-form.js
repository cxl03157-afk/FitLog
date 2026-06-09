function exerciseOptions(selected) {
  return MOCK_EXERCISES.map((ex) =>
    `<option value="${ex.name}" ${ex.name === selected ? 'selected' : ''}>${ex.name}</option>`
  ).join('');
}

function renumberSetRows(tbody) {
  tbody.querySelectorAll('tr').forEach((row, i) => {
    row.querySelector('.set-number').textContent = i + 1;
    const removeBtn = row.querySelector('.remove-set');
    if (removeBtn) removeBtn.style.visibility = tbody.children.length > 1 ? 'visible' : 'hidden';
  });
}

function addSetRow(tbody, data) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="py-2 set-number"></td>
    <td><input type="number" min="0" step="0.5" required class="set-weight w-20 px-2 py-1 border rounded" value="${data?.weight ?? ''}" /></td>
    <td><input type="number" min="1" required class="set-reps w-16 px-2 py-1 border rounded" value="${data?.reps ?? ''}" /></td>
    <td><input type="text" class="set-memo w-full px-2 py-1 border rounded" value="${data?.memo ?? ''}" /></td>
    <td><button type="button" class="remove-set text-xs text-red-500">削除</button></td>
  `;
  tr.querySelector('.remove-set').addEventListener('click', () => {
    if (tbody.children.length <= 1) return;
    tr.remove();
    renumberSetRows(tbody);
  });
  tbody.appendChild(tr);
  renumberSetRows(tbody);
}

function addExerciseBlock(container, data, exerciseIndex) {
  const block = document.createElement('section');
  block.className = 'exercise-block bg-white border border-gray-200 rounded-xl p-5';
  block.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-semibold text-gray-900 exercise-label">種目 ${exerciseIndex}</h2>
      <div class="flex items-center gap-2">
        <select class="exercise-name text-sm border border-gray-300 rounded-lg px-3 py-1.5">${exerciseOptions(data?.name)}</select>
        <button type="button" class="remove-exercise text-sm text-red-500 ${exerciseIndex > 1 ? '' : 'hidden'}">種目削除</button>
      </div>
    </div>
    <table class="w-full text-sm sets-table">
      <thead>
        <tr class="text-left text-gray-500 border-b">
          <th class="pb-2 pr-2">セット</th>
          <th class="pb-2 pr-2">重量 (kg)</th>
          <th class="pb-2 pr-2">回数</th>
          <th class="pb-2 pr-2">メモ</th>
          <th class="pb-2"></th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
    <button type="button" class="add-set mt-3 text-sm text-indigo-600 font-medium">+ セット追加</button>
  `;

  const tbody = block.querySelector('tbody');
  const sets = data?.sets?.length ? data.sets : [null];
  sets.forEach((s) => addSetRow(tbody, s));

  block.querySelector('.add-set').addEventListener('click', () => addSetRow(tbody));
  block.querySelector('.remove-exercise')?.addEventListener('click', () => {
    block.remove();
    renumberExerciseBlocks(container);
  });

  container.appendChild(block);
}

function renumberExerciseBlocks(container) {
  container.querySelectorAll('.exercise-block').forEach((block, i) => {
    block.querySelector('.exercise-label').textContent = `種目 ${i + 1}`;
    const removeBtn = block.querySelector('.remove-exercise');
    if (removeBtn) removeBtn.classList.toggle('hidden', container.children.length <= 1);
  });
}

function collectFormData() {
  const exercises = [];
  document.querySelectorAll('.exercise-block').forEach((block) => {
    const name = block.querySelector('.exercise-name').value;
    const sets = [];
    block.querySelectorAll('tbody tr').forEach((row) => {
      const weight = parseFloat(row.querySelector('.set-weight').value);
      const reps = parseInt(row.querySelector('.set-reps').value, 10);
      const memo = row.querySelector('.set-memo').value;
      if (!isNaN(weight) && !isNaN(reps)) sets.push({ weight, reps, memo });
    });
    if (sets.length) exercises.push({ name, sets });
  });
  return {
    title: document.getElementById('title').value.trim(),
    trainedOn: document.getElementById('trained-on').value,
    note: document.getElementById('note').value.trim(),
    exercises,
  };
}

function initPostForm({ editId }) {
  const container = document.getElementById('exercises-container');
  const isEdit = !!editId;
  const pageTitle = document.getElementById('page-title');
  const submitBtn = document.getElementById('submit-btn');

  if (isEdit) {
    const post = getPost(editId);
    if (!post || !post.isMine) {
      location.href = 'timeline.html';
      return;
    }
    pageTitle.textContent = 'トレーニング記録を編集';
    submitBtn.textContent = '保存する';
    document.getElementById('title').value = post.title;
    document.getElementById('trained-on').value = post.trainedOn;
    document.getElementById('note').value = post.note || '';
    post.exerciseDetails.forEach((ex, i) => {
      addExerciseBlock(container, {
        name: ex.name,
        sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, memo: s.memo })),
      }, i + 1);
    });
  } else {
    document.getElementById('trained-on').value = todayISO();
    addExerciseBlock(container, null, 1);
  }

  document.getElementById('add-exercise').addEventListener('click', () => {
    const count = container.querySelectorAll('.exercise-block').length + 1;
    addExerciseBlock(container, null, count);
    renumberExerciseBlocks(container);
  });

  document.getElementById('post-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = collectFormData();
    if (!formData.exercises.length) {
      alert('少なくとも1種目・1セットを入力してください');
      return;
    }
    const post = isEdit ? updatePost(editId, formData) : addPost(formData);
    if (post) location.href = `workout-post-detail.html?id=${post.id}`;
  });
}
