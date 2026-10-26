<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
  },
  totalItems: {
    type: Number,
    required: true,
  },
  pageSize: {
    type: Number,
    default: 25,
  },
})

const emit = defineEmits(['update:currentPage'])

const pageCount = computed(() => Math.ceil(props.totalItems / props.pageSize))
const startItem = computed(() =>
  props.totalItems === 0 ? 0 : (props.currentPage - 1) * props.pageSize + 1,
)
const endItem = computed(() =>
  Math.min(props.currentPage * props.pageSize, props.totalItems),
)

function goToPage(page) {
  emit('update:currentPage', page)
}
</script>

<template>
  <div class="pagination">
    <p class="pagination-summary" role="status">
      <template v-if="totalItems">
        Affichage de {{ startItem }} à {{ endItem }} sur {{ totalItems }} résultat(s)
      </template>
      <template v-else>Aucun résultat</template>
    </p>

    <nav v-if="pageCount > 1" class="pagination-controls" aria-label="Pagination des résultats">
      <button
        type="button"
        :disabled="currentPage <= 1"
        @click="goToPage(currentPage - 1)"
      >
        Précédent
      </button>
      <span aria-current="page">Page {{ currentPage }} sur {{ pageCount }}</span>
      <button
        type="button"
        :disabled="currentPage >= pageCount"
        @click="goToPage(currentPage + 1)"
      >
        Suivant
      </button>
    </nav>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
  color: #6b706d;
  font-size: 12px;
}

.pagination-summary {
  margin: 0;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-controls button {
  padding: 8px 12px;
  border: 1px solid #dedcd3;
  border-radius: 8px;
  background: #fff;
  color: #52796f;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.pagination-controls button:hover:not(:disabled) {
  background: #e7f0ec;
}

.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 540px) {
  .pagination {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
