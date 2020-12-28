import netifaces


def get_ip():
    eth = netifaces.interfaces()[0]
    addresses = netifaces.ifaddresses(eth)
    return addresses[netifaces.AF_INET][0]['addr']

print(get_ip())