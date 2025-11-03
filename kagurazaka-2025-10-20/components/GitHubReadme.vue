<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  repo: string // format: "owner/repo"
}>()

const readme = ref('')
const loading = ref(true)
const error = ref('')
const currentBranch = ref('')

const processedMarkdown = computed(() => {
  if (!readme.value || !currentBranch.value) return ''

  // 相対パスの画像URLを絶対パスに変換
  let processed = readme.value

  // パターン1: ![alt](path) または ![alt](/path)
  processed = processed.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
    (match, alt, path) => {
      const cleanPath = path.startsWith('/') ? path : `/${path}`
      return `![${alt}](https://raw.githubusercontent.com/${props.repo}/${currentBranch.value}${cleanPath})`
    }
  )

  // パターン2: <img src="path"> または <img src="/path">
  processed = processed.replace(
    /<img\s+([^>]*\s)?src="(?!https?:\/\/)([^"]+)"([^>]*)>/gi,
    (match, before = '', path, after = '') => {
      const cleanPath = path.startsWith('/') ? path : `/${path}`
      return `<img ${before}src="https://raw.githubusercontent.com/${props.repo}/${currentBranch.value}${cleanPath}"${after}>`
    }
  )

  return processed
})

const renderedMarkdown = computed(() => {
  if (!processedMarkdown.value) return ''
  return marked(processedMarkdown.value, {
    breaks: true,
    gfm: true
  })
})

async function fetchReadme(branch: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${props.repo}/${branch}/README.md`
    )

    if (response.ok) {
      return await response.text()
    }
    return null
  } catch {
    return null
  }
}

onMounted(async () => {
  try {
    // Try common branch names in order (master first for older repos)
    const branches = ['master', 'main']

    for (const branch of branches) {
      const content = await fetchReadme(branch)
      if (content) {
        readme.value = content
        currentBranch.value = branch
        loading.value = false
        return
      }
    }

    throw new Error('README.md not found in master or main branch')
  } catch (e: any) {
    error.value = e.message
    loading.value = false
  }
})
</script>

<template>
  <div class="github-readme-container">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading README from {{ repo }}...</p>
    </div>
    <div v-else-if="error" class="error">
      <h3>⚠️ Error</h3>
      <p>{{ error }}</p>
    </div>
    <div v-else class="readme-content">
      <div class="repo-info">
        <a :href="`https://github.com/${repo}`" target="_blank" rel="noopener noreferrer">
          📦 {{ repo }}
        </a>
      </div>
      <div v-html="renderedMarkdown" class="markdown-body"></div>
    </div>
  </div>
</template>

<style scoped>
.github-readme-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  overflow: auto;
  background: white;
  border-radius: 8px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  color: #e74c3c;
  padding: 2rem;
  background: #ffe6e6;
  border-radius: 8px;
}

.repo-info {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #eee;
}

.repo-info a {
  font-size: 1.2em;
  font-weight: bold;
  color: #0366d6;
  text-decoration: none;
}

.repo-info a:hover {
  text-decoration: underline;
}

.readme-content {
  flex: 1;
  overflow-y: auto;
}

.markdown-body {
  font-size: 0.85em;
  line-height: 1.6;
}

.markdown-body h1 {
  font-size: 1.8em !important;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.markdown-body h2 {
  font-size: 1.5em !important;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.markdown-body h3 {
  font-size: 1.25em !important;
}

.markdown-body code {
  background: #f6f8fa;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

.markdown-body pre {
  background: #f6f8fa;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
}

.markdown-body a {
  color: #0366d6;
}

.markdown-body ul, .markdown-body ol {
  padding-left: 2em;
}

.markdown-body img {
  max-width: 100%;
  height: auto;
}
</style>
