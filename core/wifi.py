# define 	PHDR_802_11_PHY_UNKNOWN   0 /* PHY not known */
# define 	PHDR_802_11_PHY_11_FHSS   1 /* 802.11 FHSS */
# define 	PHDR_802_11_PHY_11_IR   2 /* 802.11 IR */
# define 	PHDR_802_11_PHY_11_DSSS   3 /* 802.11 DSSS */
# define 	PHDR_802_11_PHY_11B   4 /* 802.11b */
# define 	PHDR_802_11_PHY_11A   5 /* 802.11a */
# define 	PHDR_802_11_PHY_11G   6 /* 802.11g */
# define 	PHDR_802_11_PHY_11N   7 /* 802.11n */
# define 	PHDR_802_11_PHY_11AC   8 /* 802.11ac */
# define 	PHDR_802_11_PHY_11AD   9 /* 802.11ad */
# define 	PHDR_802_11_PHY_11AH   10 /* 802.11ah */
# define 	PHDR_802_11_PHY_11AX   11 /* 802.11ax */
# define 	PHDR_802_11_PHY_11BE   12 /* 802.11be - EHT */
# From https://www.wireshark.org/docs/wsar_html/wtap_8h.html
# Complete mapping of phy int to wifi protocol

# Using https://en.wikipedia.org/wiki/IEEE_802.11#cite_note-80211ns_sgi-29 for bandwidth, stream data rate
# Mapping of Wi-Fi PHY types to key parameters
# We will just treat 0-3 as unknown, as these are virtually never used
# Will also ignore some of the not as popular wifi standards
phy_info = {
    0: {
        "name": "UNKNOWN",
    },
    1: {
        "name": "FHSS",
    },
    2: {
        "name": "IR",
    },
    3: {
        "name": "DSSS",
    },
    4: {
        "name": "802.11b",
        "supported_rates_mbps": [1, 2, 5.5, 11],
        "channel_widths_mhz": [22],
    },
    5: {
        "name": "802.11a",
        "supported_rates_mbps": [6, 9, 12, 18, 24, 36, 48, 54],
        "channel_widths_mhz": [20],
    },
    6: {
        "name": "802.11g",
        "supported_rates_mbps": [6, 9, 12, 18, 24, 36, 48, 54],
        "channel_widths_mhz": [20],
    },
    7: {
        "name": "802.11n",
        "max_mcs_index": 7,
        "channel_widths_mhz": [20, 40],
    },
    8: {
        "name": "802.11ac",
        "max_mcs_index": 9,
        "channel_widths_mhz": [20, 40, 80, 160],
    },
    9: {"name": "802.11ad", "channel_widths_mhz": [2160]},  # Ignore
    10: {
        "name": "802.11ah",
        "max_indices": 9,
        "channel_widths_mhz": [1, 2, 4, 8],
    },
    11: {
        "name": "802.11ax",
        "max_mcs_index": 11,
        "channel_widths_mhz": [20, 40, 80, 160, 320],
    },
    12: {
        "name": "802.11be",
        "max_mcs_index": 13,
        "channel_widths_mhz": [20, 40, 80, 160, 320],
    },
}

# Finds the index with the closest value to the target value
def closest_index(arr, target):
    return min(range(len(arr)), key=lambda i: abs(arr[i] - target))


def relative_data_rate_ratio(pkt) -> float:
    # Extract relevant info from packet
    radio = pkt.wlan_radio
    phy = int(radio.phy)
    data_rate = float(radio.data_rate)
    mcs = extract_mcs(pkt)

    # Ignore these phys
    if phy < 4 or phy == 9:
        return 0.0

    info = phy_info.get(phy, {})

    # Legacy PHY so compare against supported_rates_mbps
    if mcs is None:
        rates = info.get("supported_rates_mbps", [])
        if not rates:
            return 0.0
        pos = closest_index(rates, data_rate) + 1
        return pos / len(rates)

    # HT/VHT/HE PHY so compare MCS index to max
    max_mcs = info.get("max_mcs_index", 0)
    if max_mcs == 0:
        return 0.0

    observed = max(0, min(mcs, max_mcs))
    return observed / max_mcs


# Extracts the mcs from the packet if it exists
def extract_mcs(pkt) -> int | None:
    radio = pkt.wlan_radio
    if "11ac.user" in pkt.wlan_radio.field_names:
        return int(radio.get_field("11ac.user").mcs)
    if "11be.user" in pkt.wlan_radio.field_names:
        return int(radio.get_field("11be.user").mcs)
    if "11n.user" in pkt.wlan_radio.field_names:
        return int(radio.get_field("11n.user").mcs)
    return None
