# Installation settings and feature switches: decisions

Related: feature page [Installation settings and feature switches](../features/installation-settings.md); architecture [Installation settings](../architecture/installation-settings.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-22.** A feature switch is declared on the endpoint group as `RequiresFeature` metadata, and the feature gate, the active-household check and the 500 handler write the same FastEndpoints problem an endpoint writes, with the code only in `errors[].code`
  - Rejected: Keeping the prefix table in `FeatureGateMiddleware`; a FastEndpoints global pre-processor; writing middleware errors through `IProblemDetailsService` with a top-level `code`
  - Why: The prefix table had to be kept in step with `ApiRoutes` by hand, while the group already names the feature's endpoints; `FeatureGateTests` now pins the old prefix-to-feature table against the mapped endpoints. A pre-processor runs after binding, so a malformed body would answer 400 before the 404 of a switched-off feature. `IProblemDetailsService` writes the MVC shape, which is a second envelope beside the one every endpoint uses; the client already reads codes from `errors[]` everywhere, so dropping the top-level `code` removes a special case instead of adding one
