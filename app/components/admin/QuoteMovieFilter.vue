<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  quotes: {
    type: Array,
    default: () => [],
  },
  movie: {
    type: String,
    default: '',
  },
  quote: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:movie', 'update:quote'])

const movies = computed(() => {
  const uniqueMovies = new Map()

  for (const quote of props.quotes) {
    if (quote.ID_movie != null && !uniqueMovies.has(String(quote.ID_movie))) {
      uniqueMovies.set(String(quote.ID_movie), quote.movie_title || 'Film inconnu')
    }
  }

  return [...uniqueMovies.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
})

const quoteOptions = computed(() =>
  props.quotes.map((quote) => ({
    id: String(quote.ID_quote),
    label: quote.quote_text || 'Citation sans texte',
    detail: quote.movie_title || 'Film inconnu',
  })),
)

function createFilter(items, selectedId, emitSelection, emptyLabel, searchLabel) {
  const search = ref('')
  const isOpen = ref(false)
  const activeIndex = ref(0)

  const options = computed(() => {
    const searchText = search.value.trim().toLocaleLowerCase('fr')
    const matchingItems = items.value.filter((item) =>
      `${item.label} ${item.detail || ''}`.toLocaleLowerCase('fr').includes(searchText),
    )

    return searchText
      ? matchingItems
      : [{ id: '', label: emptyLabel }, ...matchingItems]
  })

  watch(
    selectedId,
    (id) => {
      search.value = items.value.find((item) => item.id === id)?.label || ''
    },
    { immediate: true },
  )

  function select(item) {
    emitSelection(item.id)
    search.value = item.id ? item.label : ''
    isOpen.value = false
  }

  function focus() {
    search.value = ''
    isOpen.value = true
    activeIndex.value = 0
  }

  function close() {
    isOpen.value = false
    search.value = items.value.find((item) => item.id === selectedId())?.label || ''
  }

  function keydown(event) {
    if (event.key === 'Escape') {
      close()
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      isOpen.value = true
      if (!options.value.length) return
      const direction = event.key === 'ArrowDown' ? 1 : -1
      activeIndex.value =
        (activeIndex.value + direction + options.value.length) % options.value.length
      return
    }

    if (event.key === 'Enter' && isOpen.value) {
      event.preventDefault()
      const item = options.value[activeIndex.value]
      if (item) select(item)
    }
  }

  return {
    search,
    isOpen,
    activeIndex,
    options,
    searchLabel,
    focus,
    close,
    keydown,
    select,
  }
}

const movieFilter = createFilter(
  movies,
  () => props.movie,
  (id) => emit('update:movie', id),
  'Tous les films',
  'Rechercher un film...',
)

const quoteFilter = createFilter(
  quoteOptions,
  () => props.quote,
  (id) => emit('update:quote', id),
  'Toutes les citations',
  'Rechercher une citation...',
)
</script>

<template>
  <div class="searchable-filters">
    <div class="searchable-filter">
      <input
        v-model="movieFilter.search.value"
        type="search"
        role="combobox"
        aria-label="Filtrer par film"
        aria-autocomplete="list"
        :aria-expanded="movieFilter.isOpen.value"
        aria-controls="quote-movie-options"
        :placeholder="movieFilter.searchLabel"
        @focus="movieFilter.focus"
        @input="movieFilter.isOpen.value = true; movieFilter.activeIndex.value = 0"
        @keydown="movieFilter.keydown"
        @blur="movieFilter.close"
      />

      <ul
        v-if="movieFilter.isOpen.value"
        id="quote-movie-options"
        class="filter-options"
        role="listbox"
      >
        <li
          v-for="(movie, index) in movieFilter.options.value"
          :key="movie.id || 'all-movies'"
          :aria-selected="movie.id === props.movie"
          :class="{ active: index === movieFilter.activeIndex.value }"
          role="option"
          @mousedown.prevent="movieFilter.select(movie)"
        >
          {{ movie.label }}
        </li>
        <li v-if="!movieFilter.options.value.length && movieFilter.search.value" class="no-results">
          Aucun film trouvé.
        </li>
      </ul>
    </div>

    <div class="searchable-filter">
      <input
        v-model="quoteFilter.search.value"
        type="search"
        role="combobox"
        aria-label="Filtrer par citation"
        aria-autocomplete="list"
        :aria-expanded="quoteFilter.isOpen.value"
        aria-controls="quote-text-options"
        :placeholder="quoteFilter.searchLabel"
        @focus="quoteFilter.focus"
        @input="quoteFilter.isOpen.value = true; quoteFilter.activeIndex.value = 0"
        @keydown="quoteFilter.keydown"
        @blur="quoteFilter.close"
      />

      <ul
        v-if="quoteFilter.isOpen.value"
        id="quote-text-options"
        class="filter-options"
        role="listbox"
      >
        <li
          v-for="(quote, index) in quoteFilter.options.value"
          :key="quote.id || 'all-quotes'"
          :aria-selected="quote.id === props.quote"
          :class="{ active: index === quoteFilter.activeIndex.value }"
          role="option"
          @mousedown.prevent="quoteFilter.select(quote)"
        >
          <span>{{ quote.label }}</span>
          <small v-if="quote.detail">{{ quote.detail }}</small>
        </li>
        <li v-if="!quoteFilter.options.value.length && quoteFilter.search.value" class="no-results">
          Aucune citation trouvée.
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.searchable-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}

.searchable-filter {
  position: relative;
  min-width: 0;
}

.searchable-filter input {
  box-sizing: border-box;
  width: 100%;
  padding: 13px 14px;
  border: 1px solid #dedcd3;
  border-radius: 9px;
  outline: none;
  background: #faf9f5;
  color: #212121;
  font: inherit;
  font-size: 13px;
}

.searchable-filter input:focus {
  border-color: #739c91;
  box-shadow: 0 0 0 3px rgb(115 156 145 / 15%);
}

.filter-options {
  position: absolute;
  z-index: 1;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  max-height: 240px;
  overflow-y: auto;
  margin: 0;
  padding: 4px;
  border: 1px solid #dedcd3;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 4px 12px rgb(33 33 33 / 10%);
  list-style: none;
}

.filter-options li {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 10px;
  border-radius: 6px;
  color: #212121;
  font-size: 13px;
  cursor: pointer;
}

.filter-options li.active,
.filter-options li:hover {
  background: #e7f0ec;
}

.filter-options small {
  color: #777d79;
  font-size: 11px;
}

.filter-options .no-results {
  color: #777d79;
  cursor: default;
}

@media (max-width: 640px) {
  .searchable-filters {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
