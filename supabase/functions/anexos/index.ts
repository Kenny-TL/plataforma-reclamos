import { serve } from "../_shared/http.ts";
import { handleAnexos } from "./handler.ts";
serve(handleAnexos, 6 * 1024 * 1024);
