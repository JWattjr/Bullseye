import {sha256} from '@noble/hashes/sha256';
import {bytesToHex,utf8ToBytes} from '@noble/hashes/utils';
import { canonical, type Evidence, type Specification } from './domain';
export const hash = (text: string)=>bytesToHex(sha256(utf8ToBytes(text)));
export const specificationHash = (spec: Specification)=>hash(canonical(spec));
export function makeEvidence(spec: Specification, passage: string, value: number, capture: number, synthetic=false): Evidence {
  return {original_source:synthetic?'Bullseye synthetic fixture':spec.source_url,approved_capture_url:synthetic?'/api/synthetic-evidence':spec.source_url,capture_timestamp:capture,publication_timestamp:null,content_hash:hash(passage),hash_scope:'exact extracted passage, UTF-8',extracted_passage:passage,normalized_value:value,specification_hash:specificationHash(spec),provenance:synthetic?'Synthetic fixture. Local rehearsal only; no validator fetch or consensus.':'Historical public source checked on 2026-10-01. Local practice; no protocol adjudication.',adjudication_transaction:null};
}
export function verifyEvidence(evidence: Evidence, spec: Specification): boolean {
  return evidence.specification_hash===specificationHash(spec) && evidence.content_hash===hash(evidence.extracted_passage) && Number.isSafeInteger(evidence.normalized_value) && evidence.normalized_value>=0;
}
