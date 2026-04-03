function makeError(tlKey, code) {
  return { tl_key: tlKey, code: code, text: $l(tlKey) };
}

function permanentError(json, appendElement, notActuallyPermanent) {
  const msg = Timeline.add_message(json.tl_key, $l(json.tl_key), !notActuallyPermanent);
  if (!msg) {
    return;
  }
  if (appendElement) {
    msg.$t.message.appendChild(appendElement);
  }

  return msg;
}

function nonpermanentError(json, appendElement) {
  permanentError(json, appendElement, true);
}

function removePermanentError(tlKey) {
  Timeline.remove_message(tlKey);
}
