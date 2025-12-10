// Mantido apenas para exportar SYSTEM_PROMPT (fallback) e buildFullPrompt
// O sistema de versionamento agora usa o banco de dados (agent_prompts table)
import { SYSTEM_PROMPT, buildFullPrompt } from './system.ts';

export { SYSTEM_PROMPT, buildFullPrompt };
