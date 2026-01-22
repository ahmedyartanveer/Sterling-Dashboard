def extract_address_details(full_address):
    """
    #     Parse full address into street number and street name.
        
    #     Args:
    #         full_address: Complete address string
            
    #     Returns:
    #         tuple: (street_number, street_name) or (None, None) if invalid
    #     """
    if not full_address:
        return None, None
    
    parts = full_address.split(' ')
    
    if len(parts) < 2:
        print(f"Invalid address format: {full_address}")
        return None, None
    
    street_number = parts[0]
    street_name = parts[1]
    
    return street_number, street_name