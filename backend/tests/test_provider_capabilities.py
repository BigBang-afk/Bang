"""Expiry availability must reflect the real capabilities of the active
provider - short expiries are disabled when tick granularity is insufficient."""

from app.services.market_data.capabilities import available_expiries
from app.services.market_data.mock import MockMarketDataProvider
from app.services.market_data.twelvedata import TwelveDataProvider


def test_mock_provider_enables_all_expiries():
    provider = MockMarketDataProvider()
    availabilities = available_expiries(provider)
    assert all(a.enabled for a in availabilities)


def test_twelvedata_disables_15s_and_30s_expiries():
    provider = TwelveDataProvider(api_key="fake-key-for-tests")
    availabilities = {a.seconds: a for a in available_expiries(provider)}
    assert availabilities[15].enabled is False
    assert availabilities[15].reason is not None
    assert availabilities[30].enabled is False
    assert availabilities[60].enabled is True


def test_api_key_never_appears_in_capability_output():
    provider = TwelveDataProvider(api_key="super-secret-value")
    for availability in available_expiries(provider):
        assert "super-secret-value" not in (availability.reason or "")
