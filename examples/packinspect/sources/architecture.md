# Architecture workshop

SYNTHETIC SHOWCASE — no company or private data.

## interfaces

GigE Vision vs USB3 remains open. GigE simplifies cable length but NIC bandwidth and packet jitter need measurement. USB3 reuse may reduce integration effort.

## security

Operate offline. Signed configuration imports, role separation and audit events are required. No remote inference or cloud account is allowed.

## latency

The edge PC must produce a result before the reject window. The budget includes image transfer, preprocessing, inference and PLC output.
