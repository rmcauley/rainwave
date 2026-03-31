import type { paths } from './rainwave-openapi';

type JsonBody<T> = T extends { requestBody: { content: { 'application/json': infer B } } }
  ? B
  : never;

type JsonResponse<T> = T extends {
  responses: { default: { content: { 'application/json': infer R } } };
}
  ? R
  : never;

type PostApiPath = {
  [P in keyof paths]: paths[P] extends { post: unknown } ? P : never;
}[keyof paths] &
  `/api4/${string}`;

type RainwaveAction = PostApiPath extends `/api4/${infer A}` ? A : never;

type PathForAction<A extends RainwaveAction> = Extract<PostApiPath, `/api4/${A}`>;

type OperationForAction<A extends RainwaveAction> = paths[PathForAction<A>]['post'];

type RainwaveParams<A extends RainwaveAction> = JsonBody<OperationForAction<A>>;
type RainwaveResponse<A extends RainwaveAction> = JsonResponse<OperationForAction<A>>;

export type { RainwaveAction, RainwaveParams, RainwaveResponse };
