# Liquidsoap for Rainwave

This directory contains the Liquidsoap scripts for Rainwave.

The systemd service file `rainwave-liquidsoap@.service` is a service template.
When working with individual services, specify the channel after `@`, for example:

    systemctl enable rainwave-liquidsoap@all.service

## Relay credentials

Before you can launch Liquidsoap, you need to configure the relay credentials in
a file in this directory named `_relay_creds.liq.util`.  The file should contain
the following:

```
relay_host = "<ip-or-hostname-of-relay>"
relay_pass = "<relay-password>"
```

Replace the placeholders with your actual credentials.
